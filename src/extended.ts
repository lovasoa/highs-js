(function installExtendedHighsApi(Module: any) {
  "use strict";

  const STATUS_ERROR = -1;
  const STATUS_OK = 0;
  const STATUS_WARNING = 1;
  const FORMAT = { csc: 1, csr: 2 };
  const HESSIAN_FORMAT = { triangular: 1, square: 2 };
  const callbacks = new Map();
  const liveModels = new Map();
  const native = new Map();
  let nextCallbackId = 1;
  let nextTempId = 1;
  let callbackFunctionPointer = 0;

  type NativeCallable = (...args: any[]) => any;
  type HighsJsError = Error & {
    status: number;
    operation: string;
    option?: string;
  };

  class HighsError extends Error implements HighsJsError {
    readonly status = STATUS_ERROR;
    readonly operation: string;

    constructor(message: string, operation: string) {
      super(message);
      this.name = "HighsError";
      this.operation = operation;
    }
  }

  class HighsDisposedError extends HighsError {
    constructor() {
      super("This HiGHS model has been disposed", "dispose");
      this.name = "HighsDisposedError";
    }
  }

  class HighsValidationError extends HighsError {
    constructor(message: string) {
      super(message, "validate");
      this.name = "HighsValidationError";
    }
  }

  class HighsReentrancyError extends HighsError {
    constructor() {
      super(
        "Only callback control methods may be called while HiGHS is executing a callback",
        "callback"
      );
      this.name = "HighsReentrancyError";
    }
  }

  class HighsUnsupportedOptionError extends HighsError {
    readonly option: string;

    constructor(option: string) {
      super(
        "Option '" +
          option +
          "' is not supported by the single-threaded data-only API",
        "setOptionValue"
      );
      this.name = "HighsUnsupportedOptionError";
      this.option = option;
    }
  }

  function nativeFunction(
    name: string,
    returnType: string | null,
    argumentTypes: string[]
  ): NativeCallable {
    const key = name + ":" + returnType + ":" + argumentTypes.join(",");
    let wrapped = native.get(key);
    if (!wrapped) {
      const callable = Module["cwrap"](name, returnType, argumentTypes);
      wrapped = function (...args: any[]) {
        const result = callable.apply(null, args);
        const owner = liveModels.get(args[0]);
        if (owner) owner._throwCallbackError();
        return result;
      };
      native.set(key, wrapped);
    }
    return wrapped;
  }

  function numericFunction(
    name: string,
    argumentCount: number,
    returnType: string | null = "number"
  ): NativeCallable {
    return nativeFunction(
      name,
      returnType,
      new Array(argumentCount).fill("number")
    );
  }

  function stringFunction(
    name: string,
    before: number,
    after: number,
    returnType: string | null = "number"
  ): NativeCallable {
    return nativeFunction(
      name,
      returnType,
      new Array(before || 0)
        .fill("number")
        .concat(["string"], new Array(after || 0).fill("number"))
    );
  }

  function heapU8() {
    return HEAPU8;
  }

  function heap32() {
    return HEAP32;
  }

  function heapF64() {
    return HEAPF64;
  }

  function utf8(pointer: number): string {
    return pointer ? UTF8ToString(pointer) : "";
  }

  function validationError(message: string): HighsJsError {
    return new HighsValidationError(message);
  }

  function disposedError(): HighsJsError {
    return new HighsDisposedError();
  }

  function nativeError(operation: string): HighsJsError {
    return new HighsError(operation + " failed with HiGHS status -1", operation);
  }

  function unsupportedOptionError(option: string): HighsJsError {
    return new HighsUnsupportedOptionError(option);
  }

  function reentrancyError(): HighsJsError {
    return new HighsReentrancyError();
  }

  function rawStatus(status: number) {
    return { status: status };
  }

  function rawResult(status: number, value?: any) {
    return status === STATUS_ERROR
      ? { status: status }
      : { status: status, value: value };
  }

  function callMetadata(status: number, operation: string) {
    if (status === STATUS_ERROR) throw nativeError(operation);
    return {
      status: status,
      warnings:
        status === STATUS_WARNING
          ? [operation + " completed with a HiGHS warning"]
          : [],
    };
  }

  function requireInteger(value: any, label: string, minimum: number = 0) {
    if (!Number.isSafeInteger(value) || value < (minimum || 0) || value > 2147483647)
      throw validationError(label + " must be a 32-bit non-negative integer");
    return value;
  }

  function requireSignedInteger(value: any, label: string) {
    if (
      !Number.isSafeInteger(value) ||
      value < -2147483648 ||
      value > 2147483647
    )
      throw validationError(label + " must be a signed 32-bit integer");
    return value;
  }

  function asArray(value: any, label: string): ArrayLike<any> {
    if (value == null || typeof value.length !== "number")
      throw validationError(label + " must be an array or typed array");
    return value;
  }

  function validateLength(value: any, expected: number, label: string) {
    asArray(value, label);
    if (value.length !== expected)
      throw validationError(
        label + " must contain " + expected + " values; got " + value.length
      );
    return value;
  }

  function validateFiniteOrInfinity(value: any, label: string) {
    if (typeof value !== "number" || Number.isNaN(value))
      throw validationError(label + " must be a number");
    return value;
  }

  function validateDoubleArray(value: any, expected: number, label: string) {
    validateLength(value, expected, label);
    for (let index = 0; index < value.length; index++)
      validateFiniteOrInfinity(value[index], label + "[" + index + "]");
    return value;
  }

  function validateIndexArray(
    value: any,
    expected: number | null,
    label: string,
    upperBound?: number
  ) {
    if (expected == null) asArray(value, label);
    else validateLength(value, expected, label);
    for (let index = 0; index < value.length; index++) {
      const item = value[index];
      requireInteger(item, label + "[" + index + "]", 0);
      if (upperBound != null && item >= upperBound)
        throw validationError(label + "[" + index + "] is outside the model");
    }
    return value;
  }

  function validateSparseMatrix(matrix, numRows, numCols, label) {
    if (!matrix || (matrix.format !== "csc" && matrix.format !== "csr"))
      throw validationError(label + ".format must be 'csc' or 'csr'");
    if (matrix.numRows !== numRows || matrix.numCols !== numCols)
      throw validationError(label + " dimensions do not match the model");
    const major = matrix.format === "csc" ? numCols : numRows;
    validateIndexArray(matrix.starts, major + 1, label + ".starts");
    if (matrix.starts[0] !== 0)
      throw validationError(label + ".starts must begin with zero");
    for (let index = 1; index < matrix.starts.length; index++) {
      if (matrix.starts[index] < matrix.starts[index - 1])
        throw validationError(label + ".starts must be monotonic");
    }
    const nonzeros = matrix.starts[major];
    validateIndexArray(
      matrix.indices,
      nonzeros,
      label + ".indices",
      matrix.format === "csc" ? numRows : numCols
    );
    validateDoubleArray(matrix.values, nonzeros, label + ".values");
    return nonzeros;
  }

  function validateHessian(hessian, dimension, label) {
    if (!hessian || !(hessian.format in HESSIAN_FORMAT))
      throw validationError(label + ".format must be 'triangular' or 'square'");
    if (hessian.dimension !== dimension)
      throw validationError(label + ".dimension must equal numCols");
    validateIndexArray(hessian.starts, dimension + 1, label + ".starts");
    if (hessian.starts[0] !== 0)
      throw validationError(label + ".starts must begin with zero");
    for (let index = 1; index < hessian.starts.length; index++) {
      if (hessian.starts[index] < hessian.starts[index - 1])
        throw validationError(label + ".starts must be monotonic");
    }
    const nonzeros = hessian.starts[dimension];
    validateIndexArray(hessian.indices, nonzeros, label + ".indices", dimension);
    validateDoubleArray(hessian.values, nonzeros, label + ".values");
    return nonzeros;
  }

  function validateModel(model) {
    if (!model || typeof model !== "object")
      throw validationError("model must be an object");
    const numCols = requireInteger(model.numCols, "numCols", 0);
    const numRows = requireInteger(model.numRows, "numRows", 0);
    validateDoubleArray(model.colCost, numCols, "colCost");
    validateDoubleArray(model.colLower, numCols, "colLower");
    validateDoubleArray(model.colUpper, numCols, "colUpper");
    validateDoubleArray(model.rowLower, numRows, "rowLower");
    validateDoubleArray(model.rowUpper, numRows, "rowUpper");
    const numNonzeros = validateSparseMatrix(
      model.matrix,
      numRows,
      numCols,
      "matrix"
    );
    if (model.integrality != null) {
      validateIndexArray(model.integrality, numCols, "integrality");
      for (let index = 0; index < numCols; index++) {
        if (model.integrality[index] > 4)
          throw validationError("integrality values must be between 0 and 4");
      }
    }
    const hessianNonzeros = model.hessian
      ? validateHessian(model.hessian, numCols, "hessian")
      : 0;
    const sense = model.sense == null ? 1 : model.sense;
    if (sense !== 1 && sense !== -1)
      throw validationError("sense must be 1 (minimize) or -1 (maximize)");
    validateFiniteOrInfinity(model.offset == null ? 0 : model.offset, "offset");
    if (model.modelName != null && typeof model.modelName !== "string")
      throw validationError("modelName must be a string");
    for (const [names, count, label] of [
      [model.colNames, numCols, "colNames"],
      [model.rowNames, numRows, "rowNames"],
    ]) {
      if (names == null) continue;
      validateLength(names, count, label);
      for (let index = 0; index < names.length; index++)
        if (typeof names[index] !== "string")
          throw validationError(label + "[" + index + "] must be a string");
    }
    return { numCols, numRows, numNonzeros, hessianNonzeros, sense };
  }

  function validateLinearObjective(objective, numCols, label) {
    if (!objective || typeof objective !== "object")
      throw validationError(label + " must be an object");
    validateFiniteOrInfinity(objective.weight, label + ".weight");
    validateFiniteOrInfinity(objective.offset, label + ".offset");
    validateDoubleArray(objective.coefficients, numCols, label + ".coefficients");
    validateFiniteOrInfinity(
      objective.absoluteTolerance,
      label + ".absoluteTolerance"
    );
    validateFiniteOrInfinity(
      objective.relativeTolerance,
      label + ".relativeTolerance"
    );
    requireSignedInteger(objective.priority, label + ".priority");
  }

  class Arena {
    private readonly pointers: number[];

    constructor() {
      this.pointers = [];
    }

    bytes(byteLength) {
      requireInteger(byteLength, "allocation size", 0);
      const pointer = _malloc(Math.max(1, byteLength));
      if (!pointer) throw new RangeError("Unable to allocate WebAssembly memory");
      this.pointers.push(pointer);
      return pointer;
    }

    ints(values) {
      const pointer = this.bytes(values.length * 4);
      heap32().set(values, pointer >> 2);
      return pointer;
    }

    doubles(values) {
      const pointer = this.bytes(values.length * 8);
      heapF64().set(values, pointer >> 3);
      return pointer;
    }

    /** Pack several arrays into one aligned allocation to reduce allocator churn. */
    pack(entries: readonly { type: "i32" | "f64"; values: ArrayLike<number> }[]) {
      const offsets: number[] = [];
      let byteLength = 0;
      for (const entry of entries) {
        const alignment = entry.type === "f64" ? 8 : 4;
        byteLength = Math.ceil(byteLength / alignment) * alignment;
        offsets.push(byteLength);
        byteLength += entry.values.length * alignment;
      }
      const base = this.bytes(byteLength);
      entries.forEach((entry, index) => {
        const pointer = base + offsets[index];
        if (entry.type === "f64")
          heapF64().set(entry.values, pointer >> 3);
        else heap32().set(entry.values, pointer >> 2);
      });
      return offsets.map((offset) => base + offset);
    }

    outInts(length) {
      const pointer = this.bytes(length * 4);
      heap32().fill(0, pointer >> 2, (pointer >> 2) + length);
      return pointer;
    }

    outDoubles(length) {
      const pointer = this.bytes(length * 8);
      heapF64().fill(0, pointer >> 3, (pointer >> 3) + length);
      return pointer;
    }

    free() {
      for (let index = this.pointers.length - 1; index >= 0; index--)
        _free(this.pointers[index]);
      this.pointers.length = 0;
    }
  }

  function withArena(operation) {
    const arena = new Arena();
    try {
      return operation(arena);
    } finally {
      arena.free();
    }
  }

  function copyInts(pointer, length) {
    return heap32().slice(pointer >> 2, (pointer >> 2) + length);
  }

  function copyDoubles(pointer, length) {
    return heapF64().slice(pointer >> 3, (pointer >> 3) + length);
  }

  function readInt64(pointer) {
    return new BigInt64Array(heapU8().buffer, pointer, 1)[0];
  }

  function privateFilename(extension) {
    return "/tmp/highs-js-" + nextTempId++ + "." + extension;
  }

  function withInputFile(source, operation) {
    if (!source || (source.format !== "lp" && source.format !== "mps"))
      throw validationError("format must be 'lp' or 'mps'");
    if (!(typeof source.data === "string" || ArrayBuffer.isView(source.data)))
      throw validationError("model data must be a string or Uint8Array");
    const filename = privateFilename(source.format);
    try {
      FS.writeFile(filename, source.data);
      return operation(filename);
    } finally {
      try {
        FS.unlink(filename);
      } catch (_) {}
    }
  }

  function withTextInput(text, extension, operation) {
    if (typeof text !== "string") throw validationError("data must be a string");
    const filename = privateFilename(extension);
    try {
      FS.writeFile(filename, text);
      return operation(filename);
    } finally {
      try {
        FS.unlink(filename);
      } catch (_) {}
    }
  }

  function withOutputFile(extension, encoding, operation) {
    const filename = privateFilename(extension);
    try {
      const status = operation(filename);
      if (status === STATUS_ERROR) return rawResult(status);
      const value = FS.readFile(
        filename,
        encoding === "utf8" ? { encoding: "utf8" } : undefined
      );
      return rawResult(status, value);
    } finally {
      try {
        FS.unlink(filename);
      } catch (_) {}
    }
  }

  function isForbiddenOption(name) {
    return (
      /thread|parallel|concurr/i.test(name) ||
      /(^|_)(log_file|read_.*_file|write_.*_file|solution_file|.*_file)$/.test(name) ||
      /^write_.*_to_file$/.test(name)
    );
  }

  function validateOption(name) {
    if (typeof name !== "string" || !name) throw validationError("option name is required");
    if (isForbiddenOption(name)) throw unsupportedOptionError(name);
  }

  function rawOptionIsAllowed(name) {
    if (typeof name !== "string" || !name)
      throw validationError("option name is required");
    return !isForbiddenOption(name);
  }

  function validateOptionText(text) {
    if (typeof text !== "string")
      throw validationError("option data must be a string");
    for (const line of text.split(/\r?\n/)) {
      const match = /^\s*([A-Za-z][A-Za-z0-9_]*)\b/.exec(line);
      if (match && !line.trimStart().startsWith("#")) validateOption(match[1]);
    }
  }

  function selectionArguments(selection, dimension, arena, label) {
    if (!selection || typeof selection !== "object")
      throw validationError(label + " selection must be tagged");
    if (selection.kind === "range") {
      const from = requireInteger(selection.from, label + ".from", 0);
      const to = requireInteger(selection.to, label + ".to", 0);
      if (to < from || to >= dimension)
        throw validationError(label + " range is outside the model");
      return { suffix: "ByRange", prefix: [from, to], count: to - from + 1 };
    }
    if (selection.kind === "set") {
      validateIndexArray(selection.indices, null, label + ".indices", dimension);
      for (let index = 1; index < selection.indices.length; index++)
        if (selection.indices[index] <= selection.indices[index - 1])
          throw validationError(label + " set indices must increase strictly");
      return {
        suffix: "BySet",
        prefix: [selection.indices.length, arena.ints(selection.indices)],
        count: selection.indices.length,
      };
    }
    if (selection.kind === "mask") {
      validateLength(selection.mask, dimension, label + ".mask");
      const mask = new Int32Array(dimension);
      let count = 0;
      for (let index = 0; index < dimension; index++) {
        if (
          selection.mask[index] !== false &&
          selection.mask[index] !== true &&
          selection.mask[index] !== 0 &&
          selection.mask[index] !== 1
        )
          throw validationError(label + ".mask values must be boolean, 0, or 1");
        mask[index] = selection.mask[index] ? 1 : 0;
        count += mask[index];
      }
      return { suffix: "ByMask", prefix: [arena.ints(mask)], count: count };
    }
    throw validationError(label + ".kind must be 'range', 'set', or 'mask'");
  }

  function dimensions(pointer) {
    return {
      numCols: numericFunction("Highs_getNumCol", 1)(pointer),
      numRows: numericFunction("Highs_getNumRow", 1)(pointer),
      numNonzeros: numericFunction("Highs_getNumNz", 1)(pointer),
      hessianNonzeros: numericFunction("Highs_getHessianNumNz", 1)(pointer),
    };
  }

  function presolvedDimensions(pointer) {
    return {
      numCols: numericFunction("Highs_getPresolvedNumCol", 1)(pointer),
      numRows: numericFunction("Highs_getPresolvedNumRow", 1)(pointer),
      numNonzeros: numericFunction("Highs_getPresolvedNumNz", 1)(pointer),
    };
  }

  class RawModel {
    #pointer: number;
    #disposed: boolean;
    _callbackDepth: number;
    _callbackId: number;
    _callbackError: unknown;
    _callbackErrorPending: boolean;
    _callbackNumCols = 0;

    constructor(pointer) {
      this.#pointer = pointer;
      this.#disposed = false;
      this._callbackDepth = 0;
      this._callbackId = 0;
      this._callbackError = undefined;
      this._callbackErrorPending = false;
      liveModels.set(pointer, this);
    }

    get disposed() {
      return this.#disposed;
    }

    _require(callbackSafe = false) {
      if (this.#disposed) throw disposedError();
      if (this._callbackDepth && !callbackSafe) throw reentrancyError();
      return this.#pointer;
    }

    _rememberCallbackError(error) {
      if (!this._callbackErrorPending) {
        this._callbackError = error;
        this._callbackErrorPending = true;
      }
    }

    _throwCallbackError() {
      if (!this._callbackErrorPending) return;
      const error = this._callbackError;
      this._callbackError = undefined;
      this._callbackErrorPending = false;
      throw error;
    }

    clear() {
      return this._simple("Highs_clear");
    }

    clearSolver() {
      return this._simple("Highs_clearSolver");
    }

    presolve() {
      return this._simple("Highs_presolve");
    }

    getRunTime() {
      return numericFunction("Highs_getRunTime", 1)(this._require(false));
    }

    readModel(source) {
      const pointer = this._require(false);
      return rawStatus(
        withInputFile(source, function (filename) {
          return stringFunction("Highs_readModel", 1, 0)(pointer, filename);
        })
      );
    }

    exportPresolvedModel(format) {
      const pointer = this._require(false);
      if (format !== "lp" && format !== "mps")
        throw validationError("format must be 'lp' or 'mps'");
      return withOutputFile(format, format === "lp" ? "utf8" : undefined, function (filename) {
        return stringFunction("Highs_writePresolvedModel", 1, 0)(pointer, filename);
      });
    }

    passModel(model) {
      const pointer = this._require(false);
      const result = withArena(function (arena) {
        const marshalled = passModelArguments(model, arena);
        return numericFunction("Highs_passModel", 21).apply(
          null,
          [pointer].concat(marshalled.values)
        );
      });
      const nameStatus = result === STATUS_ERROR ? result : passNames(pointer, model);
      return rawStatus(
        result === STATUS_ERROR || nameStatus === STATUS_ERROR
          ? STATUS_ERROR
          : Math.max(result, nameStatus)
      );
    }

    passMip(model) {
      const pointer = this._require(false);
      const result = withArena(function (arena) {
        const shape = validateModel(model);
        const matrix = model.matrix;
        if (!model.integrality)
          throw validationError("passMip requires an integrality vector");
        const packed = packLpArrays(model, arena, true);
        return numericFunction("Highs_passMip", 16)(
          pointer,
          shape.numCols,
          shape.numRows,
          shape.numNonzeros,
          FORMAT[matrix.format],
          shape.sense,
          model.offset == null ? 0 : model.offset,
          ...packed
        );
      });
      const nameStatus = result === STATUS_ERROR ? result : passNames(pointer, model);
      return rawStatus(
        result === STATUS_ERROR || nameStatus === STATUS_ERROR
          ? STATUS_ERROR
          : Math.max(result, nameStatus)
      );
    }

    passHessian(hessian) {
      const pointer = this._require(false);
      const dimension = dimensions(pointer).numCols;
      return rawStatus(
        withArena(function (arena) {
          const nonzeros = validateHessian(hessian, dimension, "hessian");
          return numericFunction("Highs_passHessian", 7)(
            pointer,
            dimension,
            nonzeros,
            HESSIAN_FORMAT[hessian.format],
            arena.ints(Array.prototype.slice.call(hessian.starts, 0, -1)),
            arena.ints(hessian.indices),
            arena.doubles(hessian.values)
          );
        })
      );
    }

    addLinearObjective(objective) {
      const pointer = this._require(false);
      const numCols = dimensions(pointer).numCols;
      validateLinearObjective(objective, numCols, "objective");
      return rawStatus(
        withArena(function (arena) {
          return numericFunction("Highs_addLinearObjective", 7)(
            pointer,
            objective.weight,
            objective.offset,
            arena.doubles(objective.coefficients),
            objective.absoluteTolerance,
            objective.relativeTolerance,
            requireSignedInteger(objective.priority, "priority")
          );
        })
      );
    }

    passRowName(index, name) {
      const pointer = this._require(false);
      requireInteger(index, "row", 0);
      if (typeof name !== "string") throw validationError("name must be a string");
      return rawStatus(
        stringFunction("Highs_passRowName", 2, 0)(pointer, index, name)
      );
    }

    passModelName(name) {
      if (typeof name !== "string") throw validationError("name must be a string");
      return rawStatus(
        stringFunction("Highs_passModelName", 1, 0)(this._require(false), name)
      );
    }

    getOptionType(name) {
      const pointer = this._require(false);
      if (!rawOptionIsAllowed(name)) return rawResult(STATUS_ERROR);
      return withArena(function (arena) {
        const output = arena.outInts(1);
        const status = stringFunction("Highs_getOptionType", 1, 1)(pointer, name, output);
        const types = ["boolean", "integer", "double", "string"];
        return rawResult(status, types[heap32()[output >> 2]]);
      });
    }

    resetOptions() {
      return this._simple("Highs_resetOptions");
    }

    exportOptions(deviationsOnly) {
      const pointer = this._require(false);
      const result = withOutputFile("options", "utf8", function (filename) {
        return stringFunction(
          deviationsOnly ? "Highs_writeOptionsDeviations" : "Highs_writeOptions",
          1,
          0
        )(pointer, filename);
      });
      if (result.status !== STATUS_ERROR) {
        result.value = result.value
          .split(/\r?\n/)
          .filter(function (line) {
            const match = /^\s*([A-Za-z][A-Za-z0-9_]*)\b/.exec(line);
            return !match || !isForbiddenOption(match[1]);
          })
          .join("\n");
      }
      return result;
    }

    getOptionName(index) {
      const pointer = this._require(false);
      requireInteger(index, "option index", 0);
      return withArena(function (arena) {
        const output = arena.outInts(1);
        const status = numericFunction("Highs_getOptionName", 3)(pointer, index, output);
        const namePointer = heap32()[output >> 2] >>> 0;
        if (!namePointer) return rawResult(status, "");
        try {
          return rawResult(status, utf8(namePointer));
        } finally {
          _free(namePointer);
        }
      });
    }

    getInfoType(name) {
      const pointer = this._require(false);
      if (typeof name !== "string" || !name) throw validationError("info name is required");
      return withArena(function (arena) {
        const output = arena.outInts(1);
        const status = stringFunction("Highs_getInfoType", 1, 1)(pointer, name, output);
        const type = heap32()[output >> 2];
        return rawResult(
          status,
          type === -1 ? "int64" : type === 1 ? "integer" : type === 2 ? "double" : undefined
        );
      });
    }

    getDimensions() {
      return dimensions(this._require(false));
    }

    getInfinity() {
      return numericFunction("Highs_getInfinity", 1)(this._require(false));
    }

    getModelStatus() {
      return numericFunction("Highs_getModelStatus", 1)(this._require(false));
    }

    getSolution() {
      const pointer = this._require(false);
      const modelStatus = this.getModelStatus();
      if (modelStatus === 0 || modelStatus === 6)
        throw new HighsError("The model has not been solved", "getSolution");
      const shape = dimensions(pointer);
      return withArena(function (arena) {
        const colValue = arena.outDoubles(shape.numCols);
        const colDual = arena.outDoubles(shape.numCols);
        const rowValue = arena.outDoubles(shape.numRows);
        const rowDual = arena.outDoubles(shape.numRows);
        const status = numericFunction("Highs_getSolution", 5)(
          pointer,
          colValue,
          colDual,
          rowValue,
          rowDual
        );
        return rawResult(status, {
          colValue: copyDoubles(colValue, shape.numCols),
          rowValue: copyDoubles(rowValue, shape.numRows),
          colDual: copyDoubles(colDual, shape.numCols),
          rowDual: copyDoubles(rowDual, shape.numRows),
        });
      });
    }

    setSolution(solution) {
      const pointer = this._require(false);
      const shape = dimensions(pointer);
      return rawStatus(
        withArena(function (arena) {
          function optional(values, length, label) {
            if (values == null) return 0;
            validateDoubleArray(values, length, label);
            return arena.doubles(values);
          }
          return numericFunction("Highs_setSolution", 5)(
            pointer,
            optional(solution.colValue, shape.numCols, "colValue"),
            optional(solution.rowValue, shape.numRows, "rowValue"),
            optional(solution.colDual, shape.numCols, "colDual"),
            optional(solution.rowDual, shape.numRows, "rowDual")
          );
        })
      );
    }

    setBasis(basis) {
      const pointer = this._require(false);
      const shape = dimensions(pointer);
      if (!basis) throw validationError("basis is required");
      validateIndexArray(basis.colStatus, shape.numCols, "colStatus");
      validateIndexArray(basis.rowStatus, shape.numRows, "rowStatus");
      return rawStatus(
        withArena(function (arena) {
          return numericFunction("Highs_setBasis", 3)(
            pointer,
            arena.ints(basis.colStatus),
            arena.ints(basis.rowStatus)
          );
        })
      );
    }

    postsolve(input) {
      const pointer = this._require(false);
      const shape = presolvedDimensions(pointer);
      if (!input || input.colValue == null)
        throw validationError("postsolve requires colValue");
      validateDoubleArray(input.colValue, shape.numCols, "colValue");
      if (input.colDual != null)
        validateDoubleArray(input.colDual, shape.numCols, "colDual");
      if (input.rowDual != null)
        validateDoubleArray(input.rowDual, shape.numRows, "rowDual");
      return rawStatus(
        withArena(function (arena) {
          return numericFunction("Highs_postsolve", 4)(
            pointer,
            arena.doubles(input.colValue),
            input.colDual ? arena.doubles(input.colDual) : 0,
            input.rowDual ? arena.doubles(input.rowDual) : 0
          );
        })
      );
    }

    getObjectiveOffset() {
      const pointer = this._require(false);
      return withArena(function (arena) {
        const output = arena.outDoubles(1);
        const status = numericFunction("Highs_getObjectiveOffset", 2)(pointer, output);
        return rawResult(status, heapF64()[output >> 3]);
      });
    }

    getModel(format) {
      return getLpData(this, "Highs_getModel", format, true);
    }

    getPresolvedLp(format) {
      return getLpData(this, "Highs_getPresolvedLp", format, false);
    }

    getFixedLp(format) {
      const result = getLpData(this, "Highs_getFixedLp", format, false);
      if (result.status !== STATUS_ERROR && result.value)
        result.value.integrality.fill(0);
      return result;
    }

    ensureRowwise() {
      return this._simple("Highs_ensureRowwise");
    }

    addVars(lower, upper) {
      const pointer = this._require(false);
      asArray(lower, "lower");
      validateDoubleArray(upper, lower.length, "upper");
      validateDoubleArray(lower, lower.length, "lower");
      return rawStatus(
        withArena(function (arena) {
          return numericFunction("Highs_addVars", 4)(
            pointer,
            lower.length,
            arena.doubles(lower),
            arena.doubles(upper)
          );
        })
      );
    }

    addCol(cost, lower, upper, entries) {
      const pointer = this._require(false);
      validateFiniteOrInfinity(cost, "cost");
      validateFiniteOrInfinity(lower, "lower");
      validateFiniteOrInfinity(upper, "upper");
      validateSparseEntries(entries, dimensions(pointer).numRows);
      return rawStatus(
        withArena(function (arena) {
          return numericFunction("Highs_addCol", 7)(
            pointer,
            cost,
            lower,
            upper,
            entries.indices.length,
            arena.ints(entries.indices),
            arena.doubles(entries.values)
          );
        })
      );
    }

    addCols(data) {
      const pointer = this._require(false);
      const existingRows = dimensions(pointer).numRows;
      if (!data || !data.matrix) throw validationError("column data and matrix are required");
      const count = data.cost.length;
      validateDoubleArray(data.cost, count, "cost");
      validateDoubleArray(data.lower, count, "lower");
      validateDoubleArray(data.upper, count, "upper");
      if (data.matrix.format !== "csc")
        throw validationError("addCols requires a csc matrix");
      const nonzeros = validateSparseMatrix(data.matrix, existingRows, count, "matrix");
      return rawStatus(
        withArena(function (arena) {
          return numericFunction("Highs_addCols", 9)(
            pointer,
            count,
            arena.doubles(data.cost),
            arena.doubles(data.lower),
            arena.doubles(data.upper),
            nonzeros,
            arena.ints(Array.prototype.slice.call(data.matrix.starts, 0, -1)),
            arena.ints(data.matrix.indices),
            arena.doubles(data.matrix.values)
          );
        })
      );
    }

    changeObjectiveSense(sense) {
      if (sense !== 1 && sense !== -1)
        throw validationError("sense must be 1 or -1");
      return rawStatus(
        numericFunction("Highs_changeObjectiveSense", 2)(this._require(false), sense)
      );
    }

    changeColIntegrality(column, integrality) {
      requireInteger(column, "column", 0);
      requireInteger(integrality, "integrality", 0);
      if (integrality > 4) throw validationError("integrality must be between 0 and 4");
      return rawStatus(
        numericFunction("Highs_changeColIntegrality", 3)(
          this._require(false),
          column,
          integrality
        )
      );
    }

    changeColCost(column, cost) {
      requireInteger(column, "column", 0);
      validateFiniteOrInfinity(cost, "cost");
      return rawStatus(
        numericFunction("Highs_changeColCost", 3)(this._require(false), column, cost)
      );
    }

    changeRowBounds(row, lower, upper) {
      requireInteger(row, "row", 0);
      validateFiniteOrInfinity(lower, "lower");
      validateFiniteOrInfinity(upper, "upper");
      return rawStatus(
        numericFunction("Highs_changeRowBounds", 4)(
          this._require(false),
          row,
          lower,
          upper
        )
      );
    }

    changeColsIntegrality(selection, values) {
      const dimension = dimensions(this._require(false)).numCols;
      return changeSelected(this, "changeColsIntegrality", selection, [], [values], dimension, "columns");
    }

    changeColsBounds(selection, lower, upper) {
      const dimension = dimensions(this._require(false)).numCols;
      return changeSelected(this, "changeColsBounds", selection, [lower, upper], [], dimension, "columns");
    }

    deleteCols(selection) {
      return deleteSelected(this, "Cols", selection, dimensions(this._require(false)).numCols);
    }

    scaleCol(column, factor) {
      requireInteger(column, "column", 0);
      validateFiniteOrInfinity(factor, "factor");
      return rawStatus(
        numericFunction("Highs_scaleCol", 3)(this._require(false), column, factor)
      );
    }

    getCols(selection) {
      return getSelected(this, "Cols", selection);
    }

    getColName(column) {
      return getSafeName(this, "Highs_js_getColName", column);
    }

    getPresolvedColName(column) {
      return getSafeName(this, "Highs_js_getPresolvedColName", column);
    }

    getColByName(name) {
      return getIndexByName(this, "Col", name);
    }

    getColIntegrality(column) {
      const pointer = this._require(false);
      requireInteger(column, "column", 0);
      return withArena(function (arena) {
        const output = arena.outInts(1);
        const status = numericFunction("Highs_getColIntegrality", 3)(
          pointer,
          column,
          output
        );
        return rawResult(status, heap32()[output >> 2]);
      });
    }

    getPrimalRay() {
      return getRay(this, "Highs_getPrimalRay", dimensions(this._require(false)).numCols);
    }

    getDualUnboundednessDirection() {
      return getRay(
        this,
        "Highs_getDualUnboundednessDirection",
        dimensions(this._require(false)).numCols
      );
    }

    getBasisInverseRow(row, sparse) {
      return getBasisVector(
        this,
        "Highs_getBasisInverseRow",
        row,
        dimensions(this._require(false)).numRows,
        sparse
      );
    }

    getBasisSolve(rhs, sparse) {
      return basisSolve(this, "Highs_getBasisSolve", rhs, sparse);
    }

    getReducedRow(row, sparse) {
      const pointer = this._require(false);
      const shape = dimensions(pointer);
      requireInteger(row, "row", 0);
      return withArena(function (arena) {
        const values = arena.outDoubles(shape.numCols);
        const nonzeros = arena.outInts(1);
        const indices = arena.outInts(shape.numCols);
        const status = numericFunction("Highs_getReducedRow", 5)(
          pointer,
          row,
          values,
          nonzeros,
          indices
        );
        const value: any = { values: copyDoubles(values, shape.numCols) };
        if (sparse)
          value.nonzeroIndices = copyInts(indices, heap32()[nonzeros >> 2]);
        return rawResult(status, value);
      });
    }

    crossover(input) {
      const pointer = this._require(false);
      const shape = dimensions(pointer);
      if (!input || input.colValue == null)
        throw validationError("crossover requires colValue");
      validateDoubleArray(input.colValue, shape.numCols, "colValue");
      if ((input.colDual == null) !== (input.rowDual == null))
        throw validationError("colDual and rowDual must be supplied together");
      if (input.colDual) validateDoubleArray(input.colDual, shape.numCols, "colDual");
      if (input.rowDual) validateDoubleArray(input.rowDual, shape.numRows, "rowDual");
      return rawStatus(
        withArena(function (arena) {
          return numericFunction("Highs_crossover", 6)(
            pointer,
            shape.numCols,
            shape.numRows,
            arena.doubles(input.colValue),
            input.colDual ? arena.doubles(input.colDual) : 0,
            input.rowDual ? arena.doubles(input.rowDual) : 0
          );
        })
      );
    }

    getRanging() {
      const pointer = this._require(false);
      const shape = dimensions(pointer);
      return withArena(function (arena) {
        const colCostUp = rangingRecord(arena, shape.numCols);
        const colCostDown = rangingRecord(arena, shape.numCols);
        const colBoundUp = rangingRecord(arena, shape.numCols);
        const colBoundDown = rangingRecord(arena, shape.numCols);
        const rowBoundUp = rangingRecord(arena, shape.numRows);
        const rowBoundDown = rangingRecord(arena, shape.numRows);
        const records = [
          colCostUp,
          colCostDown,
          colBoundUp,
          colBoundDown,
          rowBoundUp,
          rowBoundDown,
        ];
        const args = [pointer];
        records.forEach(function (record) {
          args.push(
            record.valuePointer,
            record.objectivePointer,
            record.inPointer,
            record.outPointer
          );
        });
        const status = numericFunction("Highs_getRanging", args.length).apply(null, args);
        return rawResult(status, {
          colCostUp: colCostUp.detach(),
          colCostDown: colCostDown.detach(),
          colBoundUp: colBoundUp.detach(),
          colBoundDown: colBoundDown.detach(),
          rowBoundUp: rowBoundUp.detach(),
          rowBoundDown: rowBoundDown.detach(),
        });
      });
    }

    setCallback(callback) {
      const pointer = this._require(false);
      if (callback != null && typeof callback !== "function")
        throw validationError("callback must be a function or undefined");
      const previousId = this._callbackId;
      if (!callback) {
        const status = numericFunction("Highs_js_setCallback", 3)(pointer, 0, 0);
        if (status !== STATUS_ERROR) {
          if (previousId) callbacks.delete(previousId);
          this._callbackId = 0;
        }
        return rawStatus(status);
      }

      const callbackId = nextCallbackId++;
      callbacks.set(callbackId, { raw: this, callback: callback });
      const status = numericFunction("Highs_js_setCallback", 3)(
        pointer,
        ensureCallbackFunction(),
        callbackId
      );
      if (status === STATUS_ERROR) {
        callbacks.delete(callbackId);
      } else {
        if (previousId) callbacks.delete(previousId);
        this._callbackId = callbackId;
      }
      return rawStatus(status);
    }

    startCallback(type) {
      validateCallbackType(type);
      return rawStatus(
        numericFunction("Highs_startCallback", 2)(this._require(false), type)
      );
    }

    dispose() {
      if (this.#disposed) return;
      const pointer = this._require(false);
      if (this._callbackId) callbacks.delete(this._callbackId);
      liveModels.delete(pointer);
      numericFunction("Highs_destroy", 1, null)(pointer);
      this.#pointer = 0;
      this.#disposed = true;
    }

    _simple(name) {
      return rawStatus(numericFunction(name, 1)(this._require(false)));
    }

    clearModel() {
      return this._simple("Highs_clearModel");
    }

    releaseMemory() {
      return this._simple("Highs_releaseMemory");
    }

    zeroAllClocks() {
      return this._simple("Highs_zeroAllClocks");
    }

    run() {
      const pointer = this._require(false);
      this._callbackNumCols = dimensions(pointer).numCols;
      const status = numericFunction("Highs_run", 1)(pointer);
      return rawStatus(status);
    }

    exportModel(format) {
      const pointer = this._require(false);
      if (format !== "lp" && format !== "mps")
        throw validationError("format must be 'lp' or 'mps'");
      return withOutputFile(format, format === "lp" ? "utf8" : undefined, function (filename) {
        return stringFunction("Highs_writeModel", 1, 0)(pointer, filename);
      });
    }

    exportSolution(pretty) {
      const pointer = this._require(false);
      return withOutputFile("sol", "utf8", function (filename) {
        return stringFunction(pretty ? "Highs_writeSolutionPretty" : "Highs_writeSolution", 1, 0)(
          pointer,
          filename
        );
      });
    }

    passLp(model) {
      const pointer = this._require(false);
      const result = withArena(function (arena) {
        const shape = validateModel(model);
        const matrix = model.matrix;
        const packed = packLpArrays(model, arena, false);
        return numericFunction("Highs_passLp", 15)(
          pointer,
          shape.numCols,
          shape.numRows,
          shape.numNonzeros,
          FORMAT[matrix.format],
          shape.sense,
          model.offset == null ? 0 : model.offset,
          ...packed
        );
      });
      const nameStatus = result === STATUS_ERROR ? result : passNames(pointer, model);
      return rawStatus(
        result === STATUS_ERROR || nameStatus === STATUS_ERROR
          ? STATUS_ERROR
          : Math.max(result, nameStatus)
      );
    }

    passLinearObjectives(objectives) {
      const pointer = this._require(false);
      const numCols = dimensions(pointer).numCols;
      asArray(objectives, "objectives");
      return rawStatus(
        withArena(function (arena) {
          const count = objectives.length;
          const weight = new Float64Array(count);
          const offset = new Float64Array(count);
          const coefficients = new Float64Array(count * numCols);
          const absoluteTolerance = new Float64Array(count);
          const relativeTolerance = new Float64Array(count);
          const priority = new Int32Array(count);
          for (let index = 0; index < count; index++) {
            const objective = objectives[index];
            validateLinearObjective(
              objective,
              numCols,
              "objectives[" + index + "]"
            );
            weight[index] = objective.weight;
            offset[index] = objective.offset;
            coefficients.set(objective.coefficients, index * numCols);
            absoluteTolerance[index] = objective.absoluteTolerance;
            relativeTolerance[index] = objective.relativeTolerance;
            priority[index] = requireSignedInteger(
              objective.priority,
              "objectives[" + index + "].priority"
            );
          }
          return numericFunction("Highs_passLinearObjectives", 8)(
            pointer,
            count,
            arena.doubles(weight),
            arena.doubles(offset),
            arena.doubles(coefficients),
            arena.doubles(absoluteTolerance),
            arena.doubles(relativeTolerance),
            arena.ints(priority)
          );
        })
      );
    }

    clearLinearObjectives() {
      return this._simple("Highs_clearLinearObjectives");
    }

    passColName(index, name) {
      const pointer = this._require(false);
      requireInteger(index, "column", 0);
      if (typeof name !== "string") throw validationError("name must be a string");
      return rawStatus(
        stringFunction("Highs_passColName", 2, 0)(pointer, index, name)
      );
    }

    setOptionValue(name, value) {
      const pointer = this._require(false);
      if (!rawOptionIsAllowed(name)) return rawStatus(STATUS_ERROR);
      const type = typeof value;
      let status;
      if (type === "boolean")
        status = stringFunction("Highs_setBoolOptionValue", 1, 1)(
          pointer,
          name,
          value ? 1 : 0
        );
      else if (type === "string")
        status = nativeFunction("Highs_setStringOptionValue", "number", [
          "number",
          "string",
          "string",
        ])(pointer, name, value);
      else if (type === "number") {
        if (!Number.isFinite(value))
          throw validationError("numeric option values must be finite");
        if (Number.isSafeInteger(value) && value >= -2147483648 && value <= 2147483647) {
          status = stringFunction("Highs_setIntOptionValue", 1, 1)(pointer, name, value);
          if (status === STATUS_ERROR)
            status = stringFunction("Highs_setDoubleOptionValue", 1, 1)(
              pointer,
              name,
              value
            );
        } else {
          status = stringFunction("Highs_setDoubleOptionValue", 1, 1)(
            pointer,
            name,
            value
          );
        }
      } else {
        throw validationError("option values must be boolean, number, or string");
      }
      return rawStatus(status);
    }

    getOptionValue(name) {
      const pointer = this._require(false);
      if (!rawOptionIsAllowed(name)) return rawResult(STATUS_ERROR);
      const typeResult = this.getOptionType(name);
      if (typeResult.status === STATUS_ERROR) return rawResult(STATUS_ERROR);
      return withArena(function (arena) {
        if (typeResult.value === "string") {
          const output = arena.bytes(512);
          const status = stringFunction("Highs_getStringOptionValue", 1, 1)(
            pointer,
            name,
            output
          );
          return rawResult(status, utf8(output));
        }
        if (typeResult.value === "double") {
          const output = arena.outDoubles(1);
          const status = stringFunction("Highs_getDoubleOptionValue", 1, 1)(
            pointer,
            name,
            output
          );
          return rawResult(status, heapF64()[output >> 3]);
        }
        const output = arena.outInts(1);
        const getter =
          typeResult.value === "boolean"
            ? "Highs_getBoolOptionValue"
            : "Highs_getIntOptionValue";
        const status = stringFunction(getter, 1, 1)(pointer, name, output);
        const value = heap32()[output >> 2];
        return rawResult(status, typeResult.value === "boolean" ? !!value : value);
      });
    }

    readOptions(text) {
      const pointer = this._require(false);
      if (typeof text !== "string") throw validationError("option data must be a string");
      for (const line of text.split(/\r?\n/)) {
        const match = /^\s*([A-Za-z][A-Za-z0-9_]*)\b/.exec(line);
        if (
          match &&
          !line.trimStart().startsWith("#") &&
          !rawOptionIsAllowed(match[1])
        )
          return rawStatus(STATUS_ERROR);
      }
      return rawStatus(
        withTextInput(text, "options", function (filename) {
          return stringFunction("Highs_readOptions", 1, 0)(pointer, filename);
        })
      );
    }

    getNumOptions() {
      return numericFunction("Highs_getNumOptions", 1)(this._require(false));
    }

    getOptionValues(name) {
      const pointer = this._require(false);
      if (!rawOptionIsAllowed(name)) return rawResult(STATUS_ERROR);
      const typeResult = this.getOptionType(name);
      if (typeResult.status === STATUS_ERROR) return rawResult(STATUS_ERROR);
      return withArena(function (arena) {
        const type = typeResult.value;
        if (type === "boolean") {
          const current = arena.outInts(1);
          const initial = arena.outInts(1);
          const status = stringFunction("Highs_getBoolOptionValues", 1, 2)(
            pointer,
            name,
            current,
            initial
          );
          return rawResult(status, {
            name: name,
            type: type,
            current: !!heap32()[current >> 2],
            default: !!heap32()[initial >> 2],
          });
        }
        if (type === "integer") {
          const current = arena.outInts(1);
          const minimum = arena.outInts(1);
          const maximum = arena.outInts(1);
          const initial = arena.outInts(1);
          const status = stringFunction("Highs_getIntOptionValues", 1, 4)(
            pointer,
            name,
            current,
            minimum,
            maximum,
            initial
          );
          return rawResult(status, {
            name: name,
            type: type,
            current: heap32()[current >> 2],
            default: heap32()[initial >> 2],
            minimum: heap32()[minimum >> 2],
            maximum: heap32()[maximum >> 2],
          });
        }
        if (type === "double") {
          const current = arena.outDoubles(1);
          const minimum = arena.outDoubles(1);
          const maximum = arena.outDoubles(1);
          const initial = arena.outDoubles(1);
          const status = stringFunction("Highs_getDoubleOptionValues", 1, 4)(
            pointer,
            name,
            current,
            minimum,
            maximum,
            initial
          );
          return rawResult(status, {
            name: name,
            type: type,
            current: heapF64()[current >> 3],
            default: heapF64()[initial >> 3],
            minimum: heapF64()[minimum >> 3],
            maximum: heapF64()[maximum >> 3],
          });
        }
        const current = arena.bytes(512);
        const initial = arena.bytes(512);
        const status = stringFunction("Highs_getStringOptionValues", 1, 2)(
          pointer,
          name,
          current,
          initial
        );
        return rawResult(status, {
          name: name,
          type: type,
          current: utf8(current),
          default: utf8(initial),
        });
      });
    }

    getInfoValue(name) {
      const pointer = this._require(false);
      const typeResult = this.getInfoType(name);
      if (typeResult.status === STATUS_ERROR) return rawResult(STATUS_ERROR);
      return withArena(function (arena) {
        if (typeResult.value === "double") {
          const output = arena.outDoubles(1);
          const status = stringFunction("Highs_getDoubleInfoValue", 1, 1)(
            pointer,
            name,
            output
          );
          return rawResult(status, heapF64()[output >> 3]);
        }
        if (typeResult.value === "int64") {
          const output = arena.bytes(8);
          const status = stringFunction("Highs_getInt64InfoValue", 1, 1)(
            pointer,
            name,
            output
          );
          return rawResult(status, readInt64(output));
        }
        const output = arena.outInts(1);
        const status = stringFunction("Highs_getIntInfoValue", 1, 1)(
          pointer,
          name,
          output
        );
        return rawResult(status, heap32()[output >> 2]);
      });
    }

    getPresolvedDimensions() {
      return presolvedDimensions(this._require(false));
    }

    getSizeofHighsInt() {
      return numericFunction("Highs_getSizeofHighsInt", 1)(this._require(false));
    }

    getObjectiveValue() {
      return numericFunction("Highs_getObjectiveValue", 1)(this._require(false));
    }

    getBasis() {
      const pointer = this._require(false);
      const modelStatus = this.getModelStatus();
      if (modelStatus === 0 || modelStatus === 6)
        throw new HighsError("The model has not been solved", "getBasis");
      const shape = dimensions(pointer);
      return withArena(function (arena) {
        const colStatus = arena.outInts(shape.numCols);
        const rowStatus = arena.outInts(shape.numRows);
        const status = numericFunction("Highs_getBasis", 3)(
          pointer,
          colStatus,
          rowStatus
        );
        return rawResult(status, {
          colStatus: copyInts(colStatus, shape.numCols),
          rowStatus: copyInts(rowStatus, shape.numRows),
        });
      });
    }

    setSparseSolution(solution) {
      const pointer = this._require(false);
      if (!solution) throw validationError("solution is required");
      const count = solution.indices.length;
      validateIndexArray(solution.indices, null, "indices", dimensions(pointer).numCols);
      validateDoubleArray(solution.values, count, "values");
      return rawStatus(
        withArena(function (arena) {
          return numericFunction("Highs_setSparseSolution", 4)(
            pointer,
            count,
            arena.ints(solution.indices),
            arena.doubles(solution.values)
          );
        })
      );
    }

    setLogicalBasis() {
      return this._simple("Highs_setLogicalBasis");
    }

    getObjectiveSense() {
      const pointer = this._require(false);
      return withArena(function (arena) {
        const output = arena.outInts(1);
        const status = numericFunction("Highs_getObjectiveSense", 2)(pointer, output);
        return rawResult(status, heap32()[output >> 2]);
      });
    }

    getLp(format) {
      return getLpData(this, "Highs_getLp", format, false);
    }

    getIisLp(format) {
      return getLpData(this, "Highs_getIisLp", format, false);
    }

    ensureColwise() {
      return this._simple("Highs_ensureColwise");
    }

    addVar(lower, upper) {
      validateFiniteOrInfinity(lower, "lower");
      validateFiniteOrInfinity(upper, "upper");
      return rawStatus(
        numericFunction("Highs_addVar", 3)(this._require(false), lower, upper)
      );
    }

    addRow(lower, upper, entries) {
      const pointer = this._require(false);
      validateFiniteOrInfinity(lower, "lower");
      validateFiniteOrInfinity(upper, "upper");
      validateSparseEntries(entries, dimensions(pointer).numCols);
      return rawStatus(
        withArena(function (arena) {
          return numericFunction("Highs_addRow", 6)(
            pointer,
            lower,
            upper,
            entries.indices.length,
            arena.ints(entries.indices),
            arena.doubles(entries.values)
          );
        })
      );
    }

    addRows(data) {
      const pointer = this._require(false);
      const existingCols = dimensions(pointer).numCols;
      if (!data || !data.matrix) throw validationError("row data and matrix are required");
      const count = data.lower.length;
      validateDoubleArray(data.lower, count, "lower");
      validateDoubleArray(data.upper, count, "upper");
      if (data.matrix.format !== "csr")
        throw validationError("addRows requires a csr matrix");
      const nonzeros = validateSparseMatrix(data.matrix, count, existingCols, "matrix");
      return rawStatus(
        withArena(function (arena) {
          return numericFunction("Highs_addRows", 8)(
            pointer,
            count,
            arena.doubles(data.lower),
            arena.doubles(data.upper),
            nonzeros,
            arena.ints(Array.prototype.slice.call(data.matrix.starts, 0, -1)),
            arena.ints(data.matrix.indices),
            arena.doubles(data.matrix.values)
          );
        })
      );
    }

    changeObjectiveOffset(offset) {
      validateFiniteOrInfinity(offset, "offset");
      return rawStatus(
        numericFunction("Highs_changeObjectiveOffset", 2)(this._require(false), offset)
      );
    }

    clearIntegrality() {
      return this._simple("Highs_clearIntegrality");
    }

    changeColBounds(column, lower, upper) {
      requireInteger(column, "column", 0);
      validateFiniteOrInfinity(lower, "lower");
      validateFiniteOrInfinity(upper, "upper");
      return rawStatus(
        numericFunction("Highs_changeColBounds", 4)(
          this._require(false),
          column,
          lower,
          upper
        )
      );
    }

    changeCoeff(row, column, value) {
      requireInteger(row, "row", 0);
      requireInteger(column, "column", 0);
      validateFiniteOrInfinity(value, "value");
      return rawStatus(
        numericFunction("Highs_changeCoeff", 4)(
          this._require(false),
          row,
          column,
          value
        )
      );
    }

    changeColsCost(selection, values) {
      const dimension = dimensions(this._require(false)).numCols;
      return changeSelected(this, "changeColsCost", selection, [values], [], dimension, "columns");
    }

    changeRowsBounds(selection, lower, upper) {
      const dimension = dimensions(this._require(false)).numRows;
      return changeSelected(this, "changeRowsBounds", selection, [lower, upper], [], dimension, "rows");
    }

    deleteRows(selection) {
      return deleteSelected(this, "Rows", selection, dimensions(this._require(false)).numRows);
    }

    scaleRow(row, factor) {
      requireInteger(row, "row", 0);
      validateFiniteOrInfinity(factor, "factor");
      return rawStatus(
        numericFunction("Highs_scaleRow", 3)(this._require(false), row, factor)
      );
    }

    getRows(selection) {
      return getSelected(this, "Rows", selection);
    }

    getRowName(row) {
      return getSafeName(this, "Highs_js_getRowName", row);
    }

    getPresolvedRowName(row) {
      return getSafeName(this, "Highs_js_getPresolvedRowName", row);
    }

    getRowByName(name) {
      return getIndexByName(this, "Row", name);
    }

    getDualRay() {
      return getRay(this, "Highs_getDualRay", dimensions(this._require(false)).numRows);
    }

    getBasicVariables() {
      const pointer = this._require(false);
      const rows = dimensions(pointer).numRows;
      return withArena(function (arena) {
        const output = arena.outInts(rows);
        const status = numericFunction("Highs_getBasicVariables", 2)(pointer, output);
        return rawResult(status, copyInts(output, rows));
      });
    }

    getBasisInverseCol(column, sparse) {
      return getBasisVector(
        this,
        "Highs_getBasisInverseCol",
        column,
        dimensions(this._require(false)).numRows,
        sparse
      );
    }

    getBasisTransposeSolve(rhs, sparse) {
      return basisSolve(this, "Highs_getBasisTransposeSolve", rhs, sparse);
    }

    getReducedColumn(column, sparse) {
      return getBasisVector(
        this,
        "Highs_getReducedColumn",
        column,
        dimensions(this._require(false)).numRows,
        sparse
      );
    }

    feasibilityRelaxation(input) {
      const pointer = this._require(false);
      const shape = dimensions(pointer);
      if (!input) throw validationError("relaxation input is required");
      validateFiniteOrInfinity(input.globalLowerPenalty, "globalLowerPenalty");
      validateFiniteOrInfinity(input.globalUpperPenalty, "globalUpperPenalty");
      validateFiniteOrInfinity(input.globalRowPenalty, "globalRowPenalty");
      return rawStatus(
        withArena(function (arena) {
          function penalties(values, length, label) {
            if (values == null) return 0;
            validateDoubleArray(values, length, label);
            return arena.doubles(values);
          }
          return numericFunction("Highs_feasibilityRelaxation", 7)(
            pointer,
            input.globalLowerPenalty,
            input.globalUpperPenalty,
            input.globalRowPenalty,
            penalties(input.localLowerPenalty, shape.numCols, "localLowerPenalty"),
            penalties(input.localUpperPenalty, shape.numCols, "localUpperPenalty"),
            penalties(input.localRowPenalty, shape.numRows, "localRowPenalty")
          );
        })
      );
    }

    getIis() {
      const pointer = this._require(false);
      const shape = dimensions(pointer);
      return withArena(function (arena) {
        const iisNumCols = arena.outInts(1);
        const iisNumRows = arena.outInts(1);
        // Highs_getIis recomputes the IIS on every invocation. Allocate to the
        // model dimensions and call it exactly once so counts and copied data
        // necessarily describe the same computation.
        const colIndex = arena.outInts(shape.numCols);
        const rowIndex = arena.outInts(shape.numRows);
        const colBound = arena.outInts(shape.numCols);
        const rowBound = arena.outInts(shape.numRows);
        const colStatus = arena.outInts(shape.numCols);
        const rowStatus = arena.outInts(shape.numRows);
        const status = numericFunction("Highs_getIis", 9)(
          pointer,
          iisNumCols,
          iisNumRows,
          colIndex,
          rowIndex,
          colBound,
          rowBound,
          colStatus,
          rowStatus
        );
        if (status === STATUS_ERROR) return rawResult(status);
        const numCols = heap32()[iisNumCols >> 2];
        const numRows = heap32()[iisNumRows >> 2];
        if (
          numCols < 0 ||
          numCols > shape.numCols ||
          numRows < 0 ||
          numRows > shape.numRows
        )
          throw new RangeError("HiGHS returned invalid IIS dimensions");
        return rawResult(status, {
          colIndex: copyInts(colIndex, numCols),
          rowIndex: copyInts(rowIndex, numRows),
          colBound: copyInts(colBound, numCols),
          rowBound: copyInts(rowBound, numRows),
          colStatus: copyInts(colStatus, shape.numCols),
          rowStatus: copyInts(rowStatus, shape.numRows),
        });
      });
    }

    stopCallback(type) {
      validateCallbackType(type);
      return rawStatus(
        numericFunction("Highs_stopCallback", 2)(this._require(false), type)
      );
    }
  }

  function packLpArrays(model, arena: Arena, includeIntegrality: boolean) {
    const matrix = model.matrix;
    return arena.pack([
      { type: "f64", values: model.colCost },
      { type: "f64", values: model.colLower },
      { type: "f64", values: model.colUpper },
      { type: "f64", values: model.rowLower },
      { type: "f64", values: model.rowUpper },
      { type: "i32", values: Array.prototype.slice.call(matrix.starts, 0, -1) },
      { type: "i32", values: matrix.indices },
      { type: "f64", values: matrix.values },
      ...(includeIntegrality
        ? [{ type: "i32" as const, values: model.integrality }]
        : []),
    ]);
  }

  function passModelArguments(model, arena) {
    const shape = validateModel(model);
    const matrix = model.matrix;
    const hessian = model.hessian;
    const packed = arena.pack([
      { type: "f64", values: model.colCost },
      { type: "f64", values: model.colLower },
      { type: "f64", values: model.colUpper },
      { type: "f64", values: model.rowLower },
      { type: "f64", values: model.rowUpper },
      { type: "i32", values: Array.prototype.slice.call(matrix.starts, 0, -1) },
      { type: "i32", values: matrix.indices },
      { type: "f64", values: matrix.values },
      ...(hessian
        ? [
            {
              type: "i32" as const,
              values: Array.prototype.slice.call(hessian.starts, 0, -1),
            },
            { type: "i32" as const, values: hessian.indices },
            { type: "f64" as const, values: hessian.values },
          ]
        : []),
      ...(model.integrality
        ? [{ type: "i32" as const, values: model.integrality }]
        : []),
    ]);
    let packedIndex = 0;
    const colCost = packed[packedIndex++];
    const colLower = packed[packedIndex++];
    const colUpper = packed[packedIndex++];
    const rowLower = packed[packedIndex++];
    const rowUpper = packed[packedIndex++];
    const matrixStarts = packed[packedIndex++];
    const matrixIndices = packed[packedIndex++];
    const matrixValues = packed[packedIndex++];
    const hessianStarts = hessian ? packed[packedIndex++] : 0;
    const hessianIndices = hessian ? packed[packedIndex++] : 0;
    const hessianValues = hessian ? packed[packedIndex++] : 0;
    const integrality = model.integrality ? packed[packedIndex] : 0;
    return {
      shape: shape,
      values: [
        shape.numCols,
        shape.numRows,
        shape.numNonzeros,
        shape.hessianNonzeros,
        FORMAT[matrix.format],
        hessian ? HESSIAN_FORMAT[hessian.format] : 1,
        shape.sense,
        model.offset == null ? 0 : model.offset,
        colCost,
        colLower,
        colUpper,
        rowLower,
        rowUpper,
        matrixStarts,
        matrixIndices,
        matrixValues,
        hessianStarts,
        hessianIndices,
        hessianValues,
        integrality,
      ],
    };
  }

  function passNames(pointer, model) {
    let status = STATUS_OK;
    if (model.modelName != null) {
      status = Math.max(
        status,
        stringFunction("Highs_passModelName", 1, 0)(pointer, String(model.modelName))
      );
    }
    if (model.colNames != null) {
      validateLength(model.colNames, model.numCols, "colNames");
      for (let index = 0; index < model.colNames.length; index++) {
        const next = stringFunction("Highs_passColName", 2, 0)(
          pointer,
          index,
          String(model.colNames[index])
        );
        if (next === STATUS_ERROR) return next;
        status = Math.max(status, next);
      }
    }
    if (model.rowNames != null) {
      validateLength(model.rowNames, model.numRows, "rowNames");
      for (let index = 0; index < model.rowNames.length; index++) {
        const next = stringFunction("Highs_passRowName", 2, 0)(
          pointer,
          index,
          String(model.rowNames[index])
        );
        if (next === STATUS_ERROR) return next;
        status = Math.max(status, next);
      }
    }
    return status;
  }

  function getLpData(raw, cName, format, includeHessian) {
    const pointer = raw._require(false);
    const hasIntegrality = cName !== "Highs_getFixedLp";
    const matrixFormat = format == null ? "csc" : format;
    if (!(matrixFormat in FORMAT))
      throw validationError("format must be 'csc' or 'csr'");
    const knownShape: {
      numCols: number;
      numRows: number;
      numNonzeros: number;
      hessianNonzeros?: number;
    } | undefined =
      cName === "Highs_getModel" || cName === "Highs_getLp"
        ? dimensions(pointer)
        : cName === "Highs_getPresolvedLp"
          ? presolvedDimensions(pointer)
          : cName === "Highs_getFixedLp"
            ? dimensions(pointer)
            : undefined;
    return withArena(function (arena) {
      const numCol = arena.outInts(1);
      const numRow = arena.outInts(1);
      const numNz = arena.outInts(1);
      const qNumNz = includeHessian ? arena.outInts(1) : 0;
      const sense = arena.outInts(1);
      const offset = arena.outDoubles(1);
      const argumentCount = includeHessian ? 21 : hasIntegrality ? 16 : 15;
      let status = STATUS_OK;
      let cols = knownShape?.numCols ?? 0;
      let rows = knownShape?.numRows ?? 0;
      let nonzeros = knownShape?.numNonzeros ?? 0;
      let qNonzeros = includeHessian
        ? knownShape?.hessianNonzeros ?? 0
        : 0;
      if (!knownShape) {
        const firstArguments = includeHessian
          ? [
              pointer,
              FORMAT[matrixFormat],
              1,
              numCol,
              numRow,
              numNz,
              qNumNz,
              sense,
              offset,
            ]
          : [
              pointer,
              FORMAT[matrixFormat],
              numCol,
              numRow,
              numNz,
              sense,
              offset,
            ];
        const nullOutputs = includeHessian
          ? new Array(12).fill(0)
          : new Array(hasIntegrality ? 9 : 8).fill(0);
        status = numericFunction(cName, argumentCount).apply(
          null,
          firstArguments.concat(nullOutputs)
        );
        if (status === STATUS_ERROR) return rawResult(status);
        cols = heap32()[numCol >> 2];
        rows = heap32()[numRow >> 2];
        nonzeros = heap32()[numNz >> 2];
        qNonzeros = includeHessian ? heap32()[qNumNz >> 2] : 0;
      }
      const major = matrixFormat === "csc" ? cols : rows;
      const colCost = arena.outDoubles(cols);
      const colLower = arena.outDoubles(cols);
      const colUpper = arena.outDoubles(cols);
      const rowLower = arena.outDoubles(rows);
      const rowUpper = arena.outDoubles(rows);
      const starts = arena.outInts(major);
      const indices = arena.outInts(nonzeros);
      const values = arena.outDoubles(nonzeros);
      const integrality = hasIntegrality ? arena.outInts(cols) : 0;
      const qStarts = includeHessian ? arena.outInts(cols) : 0;
      const qIndices = includeHessian ? arena.outInts(qNonzeros) : 0;
      const qValues = includeHessian ? arena.outDoubles(qNonzeros) : 0;
      const outputArguments = includeHessian
        ? [
            pointer,
            FORMAT[matrixFormat],
            1,
            numCol,
            numRow,
            numNz,
            qNumNz,
            sense,
            offset,
            colCost,
            colLower,
            colUpper,
            rowLower,
            rowUpper,
            starts,
            indices,
            values,
            qStarts,
            qIndices,
            qValues,
            integrality,
          ]
        : [
            pointer,
            FORMAT[matrixFormat],
            numCol,
            numRow,
            numNz,
            sense,
            offset,
            colCost,
            colLower,
            colUpper,
            rowLower,
            rowUpper,
            starts,
            indices,
            values,
          ].concat(hasIntegrality ? [integrality] : []);
      status = numericFunction(cName, argumentCount).apply(null, outputArguments);
      if (status === STATUS_ERROR) return rawResult(status);

      const detachedStarts = new Int32Array(major + 1);
      detachedStarts.set(copyInts(starts, major));
      detachedStarts[major] = nonzeros;
      const data: any = {
        numCols: cols,
        numRows: rows,
        sense: heap32()[sense >> 2],
        offset: heapF64()[offset >> 3],
        colCost: copyDoubles(colCost, cols),
        colLower: copyDoubles(colLower, cols),
        colUpper: copyDoubles(colUpper, cols),
        rowLower: copyDoubles(rowLower, rows),
        rowUpper: copyDoubles(rowUpper, rows),
        matrix: {
          format: matrixFormat,
          numRows: rows,
          numCols: cols,
          starts: detachedStarts,
          indices: copyInts(indices, nonzeros),
          values: copyDoubles(values, nonzeros),
        },
        integrality: hasIntegrality
          ? copyInts(integrality, cols)
          : new Int32Array(cols),
      };
      if (includeHessian && qNonzeros) {
        const detachedQStarts = new Int32Array(cols + 1);
        detachedQStarts.set(copyInts(qStarts, cols));
        detachedQStarts[cols] = qNonzeros;
        data.hessian = {
          format: "triangular",
          dimension: cols,
          starts: detachedQStarts,
          indices: copyInts(qIndices, qNonzeros),
          values: copyDoubles(qValues, qNonzeros),
        };
      }
      return rawResult(status, data);
    });
  }

  function validateSparseEntries(entries, upperBound) {
    if (!entries) throw validationError("entries are required");
    validateIndexArray(entries.indices, null, "entries.indices", upperBound);
    validateDoubleArray(entries.values, entries.indices.length, "entries.values");
  }

  function changeSelected(raw, cPrefix, selection, arrays, integerArrays, dimension, label) {
    const pointer = raw._require(false);
    return rawStatus(
      withArena(function (arena) {
        const selected = selectionArguments(selection, dimension, arena, label);
        const expected = selected.suffix === "ByMask" ? dimension : selected.count;
        const pointers = arrays.map(function (values, index) {
          validateDoubleArray(values, expected, label + " values " + index);
          return arena.doubles(values);
        });
        const intPointers = integerArrays.map(function (values, index) {
          validateIndexArray(values, expected, label + " integer values " + index);
          return arena.ints(values);
        });
        const args = [pointer].concat(selected.prefix, pointers, intPointers);
        return numericFunction("Highs_" + cPrefix + selected.suffix, args.length).apply(
          null,
          args
        );
      })
    );
  }

  function deleteSelected(raw, kind, selection, dimension) {
    const pointer = raw._require(false);
    return rawStatus(
      withArena(function (arena) {
        const selected = selectionArguments(selection, dimension, arena, kind.toLowerCase());
        const args = [pointer].concat(selected.prefix);
        return numericFunction("Highs_delete" + kind + selected.suffix, args.length).apply(
          null,
          args
        );
      })
    );
  }

  function getSelected(raw, kind, selection) {
    const pointer = raw._require(false);
    const shape = dimensions(pointer);
    const isColumn = kind === "Cols";
    const dimension = isColumn ? shape.numCols : shape.numRows;
    return withArena(function (arena) {
      const selected = selectionArguments(selection, dimension, arena, kind.toLowerCase());
      const outputCount = arena.outInts(1);
      const outputNonzeros = arena.outInts(1);
      const scalarCount = isColumn ? 3 : 2;
      const firstArgs = [pointer]
        .concat(selected.prefix, [outputCount])
        .concat(new Array(scalarCount).fill(0), [outputNonzeros, 0, 0, 0]);
      const cName = "Highs_get" + kind + selected.suffix;
      let status = numericFunction(cName, firstArgs.length).apply(null, firstArgs);
      if (status === STATUS_ERROR) return rawResult(status);
      const count = heap32()[outputCount >> 2];
      const nonzeros = heap32()[outputNonzeros >> 2];
      const first = isColumn ? arena.outDoubles(count) : 0;
      const lower = arena.outDoubles(count);
      const upper = arena.outDoubles(count);
      const starts = arena.outInts(count);
      const indices = arena.outInts(nonzeros);
      const values = arena.outDoubles(nonzeros);
      const secondArgs = [pointer]
        .concat(selected.prefix, [outputCount])
        .concat(isColumn ? [first, lower, upper] : [lower, upper])
        .concat([outputNonzeros, starts, indices, values]);
      status = numericFunction(cName, secondArgs.length).apply(null, secondArgs);
      if (status === STATUS_ERROR) return rawResult(status);
      const detachedStarts = new Int32Array(count + 1);
      detachedStarts.set(copyInts(starts, count));
      detachedStarts[count] = nonzeros;
      const matrix = {
        format: isColumn ? "csc" : "csr",
        numRows: isColumn ? shape.numRows : count,
        numCols: isColumn ? count : shape.numCols,
        starts: detachedStarts,
        indices: copyInts(indices, nonzeros),
        values: copyDoubles(values, nonzeros),
      };
      return rawResult(
        status,
        isColumn
          ? {
              count: count,
              cost: copyDoubles(first, count),
              lower: copyDoubles(lower, count),
              upper: copyDoubles(upper, count),
              matrix: matrix,
            }
          : {
              count: count,
              lower: copyDoubles(lower, count),
              upper: copyDoubles(upper, count),
              matrix: matrix,
            }
      );
    });
  }

  function getSafeName(raw, bridgeName, index) {
    const pointer = raw._require(false);
    requireInteger(index, "index", 0);
    return withArena(function (arena) {
      const required = arena.outInts(1);
      let status = numericFunction(bridgeName, 5)(pointer, index, 0, 0, required);
      if (status === STATUS_ERROR) return rawResult(status);
      const capacity = heap32()[required >> 2];
      if (capacity <= 0) return rawResult(status, "");
      const output = arena.bytes(capacity);
      status = numericFunction(bridgeName, 5)(
        pointer,
        index,
        output,
        capacity,
        required
      );
      return rawResult(status, utf8(output));
    });
  }

  function getIndexByName(raw, kind, name) {
    const pointer = raw._require(false);
    if (typeof name !== "string") throw validationError("name must be a string");
    return withArena(function (arena) {
      const output = arena.outInts(1);
      const status = stringFunction("Highs_get" + kind + "ByName", 1, 1)(
        pointer,
        name,
        output
      );
      return rawResult(status, heap32()[output >> 2]);
    });
  }

  function getRay(raw, name, dimension) {
    const pointer = raw._require(false);
    return withArena(function (arena) {
      const hasRay = arena.outInts(1);
      const values = arena.outDoubles(dimension);
      const status = numericFunction(name, 3)(pointer, hasRay, values);
      return rawResult(
        status,
        heap32()[hasRay >> 2]
          ? { values: copyDoubles(values, dimension) }
          : undefined
      );
    });
  }

  function getBasisVector(raw, name, index, dimension, sparse) {
    const pointer = raw._require(false);
    return withArena(function (arena) {
      const values = arena.outDoubles(dimension);
      const nonzeros = arena.outInts(1);
      const indices = arena.outInts(dimension);
      if (index == null) throw validationError("an index is required");
      requireInteger(index, "index", 0);
      const args = [pointer, index, values, nonzeros, indices];
      const status = numericFunction(name, args.length).apply(null, args);
      const value: any = { values: copyDoubles(values, dimension) };
      if (sparse)
        value.nonzeroIndices = copyInts(indices, heap32()[nonzeros >> 2]);
      return rawResult(status, value);
    });
  }

  function basisSolve(raw, name, rhs, sparse) {
    const pointer = raw._require(false);
    const rows = dimensions(pointer).numRows;
    validateDoubleArray(rhs, rows, "rhs");
    return withArena(function (arena) {
      const solution = arena.outDoubles(rows);
      const nonzeros = arena.outInts(1);
      const indices = arena.outInts(rows);
      const status = numericFunction(name, 5)(
        pointer,
        arena.doubles(rhs),
        solution,
        nonzeros,
        indices
      );
      const value: any = { values: copyDoubles(solution, rows) };
      if (sparse)
        value.nonzeroIndices = copyInts(indices, heap32()[nonzeros >> 2]);
      return rawResult(status, value);
    });
  }

  function rangingRecord(arena, length) {
    return {
      valuePointer: arena.outDoubles(length),
      objectivePointer: arena.outDoubles(length),
      inPointer: arena.outInts(length),
      outPointer: arena.outInts(length),
      detach: function () {
        return {
          value: copyDoubles(this.valuePointer, length),
          objective: copyDoubles(this.objectivePointer, length),
          inVariable: copyInts(this.inPointer, length),
          outVariable: copyInts(this.outPointer, length),
        };
      },
    };
  }

  function callbackDataItem(dataOut, name) {
    return stringFunction("Highs_getCallbackDataOutItem", 1, 0)(dataOut, name);
  }

  function readCallbackNumber(dataOut, name, kind) {
    const pointer = callbackDataItem(dataOut, name);
    if (!pointer) return undefined;
    if (kind === "double") return heapF64()[pointer >> 3];
    if (kind === "int64") return readInt64(pointer);
    return heap32()[pointer >> 2];
  }

  const MIP_CALLBACK_FIELDS = [
    ["running_time", "double"],
    ["objective_function_value", "double"],
    ["mip_node_count", "int64"],
    ["mip_total_lp_iterations", "int64"],
    ["mip_primal_bound", "double"],
    ["mip_dual_bound", "double"],
    ["mip_gap", "double"],
  ];

  function callbackTrampoline(type, messagePointer, dataOut, dataIn, userData) {
    const entry = callbacks.get(userData);
    if (!entry) return;
    const raw = entry.raw;
    const callback = entry.callback;
    let eventActive = true;
    function requireActiveEvent() {
      if (!eventActive)
        throw validationError("callback controls expire when the callback returns");
    }
    raw._callbackDepth += 1;
    try {
      const shape = { numCols: raw._callbackNumCols };
      const data: any = {};
      const fields =
        type === 0
          ? [["log_type", "int"]]
          : type === 1
            ? [["simplex_iteration_count", "int"]]
            : type === 2
              ? [["ipm_iteration_count", "int"]]
              : type >= 3 && type <= 9
                ? MIP_CALLBACK_FIELDS
                : [];
      fields.forEach(function (item) {
        const value = readCallbackNumber(dataOut, item[0], item[1]);
        if (value !== undefined) data[item[0]] = value;
      });
      if (type === 3 || type === 4) {
        const solutionPointer = callbackDataItem(dataOut, "mip_solution");
        const solutionSize = numericFunction(
          "Highs_js_getCallbackMipSolutionSize",
          1
        )(dataOut);
        if (solutionSize < 0)
          throw new RangeError("HiGHS returned an invalid MIP solution size");
        if (solutionPointer)
          data.mip_solution = copyDoubles(solutionPointer, solutionSize);
        else if (solutionSize)
          throw new RangeError("HiGHS returned a null MIP solution");
      }
      if (type === 7) {
        const cutCount = readCallbackNumber(dataOut, "cutpool_num_cut", "int");
        const cutNonzeros = readCallbackNumber(dataOut, "cutpool_num_nz", "int");
        const cutColumns = readCallbackNumber(dataOut, "cutpool_num_col", "int");
        if (
          typeof cutCount === "number" &&
          typeof cutNonzeros === "number" &&
          typeof cutColumns === "number" &&
          cutCount >= 0 &&
          cutNonzeros >= 0
        ) {
          const starts = callbackDataItem(dataOut, "cutpool_start");
          const indices = callbackDataItem(dataOut, "cutpool_index");
          const values = callbackDataItem(dataOut, "cutpool_value");
          const lower = callbackDataItem(dataOut, "cutpool_lower");
          const upper = callbackDataItem(dataOut, "cutpool_upper");
          if (starts && indices && values && lower && upper) {
            data.cut_pool = {
              numCols: cutColumns,
              numCuts: cutCount,
              starts: copyInts(starts, cutCount + 1),
              indices: copyInts(indices, cutNonzeros),
              values: copyDoubles(values, cutNonzeros),
              lower: copyDoubles(lower, cutCount),
              upper: copyDoubles(upper, cutCount),
            };
          }
        }
      }

      const event: any = {
        type: type,
        message: utf8(messagePointer),
        data: data,
      };
      if (type === 9) {
        event.setSolution = function (solution) {
          requireActiveEvent();
          try {
            if (solution && solution.indices) {
              validateIndexArray(solution.indices, null, "indices", shape.numCols);
              validateDoubleArray(solution.values, solution.indices.length, "values");
              return rawStatus(
                withArena(function (arena) {
                  return numericFunction("Highs_setCallbackSparseSolution", 4)(
                    dataIn,
                    solution.indices.length,
                    arena.ints(solution.indices),
                    arena.doubles(solution.values)
                  );
                })
              );
            }
            validateDoubleArray(solution, shape.numCols, "solution");
            return rawStatus(
              withArena(function (arena) {
                return numericFunction("Highs_setCallbackSolution", 3)(
                  dataIn,
                  shape.numCols,
                  arena.doubles(solution)
                );
              })
            );
          } catch (error) {
            raw._rememberCallbackError(error);
            return rawStatus(STATUS_ERROR);
          }
        };
        event.repairSolution = function () {
          requireActiveEvent();
          return rawStatus(
            numericFunction("Highs_repairCallbackSolution", 1)(dataIn)
          );
        };
      } else if (type === 1 || type === 2 || type === 6) {
        event.interrupt = function () {
          requireActiveEvent();
          heap32()[dataIn >> 2] = 1;
        };
      }
      const callbackResult = callback(event);
      if (
        callbackResult &&
        (typeof callbackResult === "object" ||
          typeof callbackResult === "function") &&
        typeof callbackResult.then === "function"
      ) {
        void Promise.resolve(callbackResult).catch(function () {});
        throw validationError("callbacks must be synchronous and return undefined");
      }
    } catch (error) {
      raw._rememberCallbackError(error);
      if ((type === 1 || type === 2 || type === 6) && dataIn)
        heap32()[dataIn >> 2] = 1;
    } finally {
      eventActive = false;
      raw._callbackDepth -= 1;
    }
  }

  function ensureCallbackFunction() {
    if (!callbackFunctionPointer)
      callbackFunctionPointer = addFunction(callbackTrampoline, "viiiii");
    return callbackFunctionPointer;
  }

  function validateCallbackType(type) {
    requireInteger(type, "callback type", 0);
    if (type === 8 || type > 9)
      throw validationError("callback type must be one of 0..7 or 9");
  }

  function valueOrThrow(result, operation, owner = undefined) {
    if (result.status === STATUS_ERROR) throw nativeError(operation);
    if (owner) owner._setLast(result.status, operation);
    return result.value;
  }

  class PersistentModel {
    readonly raw: RawModel;
    lastCall: { status: number; warnings: string[] };
    readonly options: OptionStoreImpl;
    readonly info: InfoStoreImpl;

    constructor(raw) {
      this.raw = raw;
      this.lastCall = { status: STATUS_OK, warnings: [] };
      this.options = new OptionStoreImpl(this);
      this.info = new InfoStoreImpl(this);
    }

    get disposed() {
      return this.raw.disposed;
    }

    _setLast(status, operation) {
      this.lastCall = callMetadata(status, operation);
      return this.lastCall;
    }

    _value(operation, args = []) {
      return valueOrThrow(
        this.raw[operation].apply(this.raw, args || []),
        operation,
        this
      );
    }

    exportModel(format) {
      return this._value("exportModel", [format]);
    }

    exportSolution(pretty) {
      return this._value("exportSolution", [pretty]);
    }

    getPresolvedDimensions() {
      return this.raw.getPresolvedDimensions();
    }

    getModelStatus() {
      return this.raw.getModelStatus();
    }

    setSolution(solution) {
      if (solution == null) throw validationError("solution is required");
      return this._status(
        solution.indices ? "setSparseSolution" : "setSolution",
        [solution]
      );
    }

    setLogicalBasis() {
      return this._status("setLogicalBasis");
    }

    dispose() {
      this.raw.dispose();
    }

    _status(operation, args = []) {
      const result = this.raw[operation].apply(this.raw, args || []);
      return this._setLast(result.status, operation);
    }

    exportPresolvedModel(format) {
      return this._value("exportPresolvedModel", [format]);
    }

    getDimensions() {
      return this.raw.getDimensions();
    }

    getRunTime() {
      return this.raw.getRunTime();
    }

    getObjectiveValue() {
      return this.raw.getObjectiveValue();
    }

    getObjectiveSense() {
      return this._value("getObjectiveSense");
    }

    getObjectiveOffset() {
      return this._value("getObjectiveOffset");
    }

    setBasis(basis) {
      return basis == null
        ? this._status("setLogicalBasis")
        : this._status("setBasis", [basis]);
    }

    run(callbackMap) {
      const raw = this.raw;
      const activeTypes = [];
      let didRegister = false;
      try {
        if (callbackMap && Object.keys(callbackMap).length) {
          if (raw._callbackId)
            throw validationError(
              "run callbacks cannot replace a callback registered through model.raw"
            );
          const registration = raw.setCallback(function (event) {
            const callback = callbackMap[event.type];
            if (callback) return callback(event);
            return undefined;
          });
          if (registration.status === STATUS_ERROR)
            throw nativeError("setCallback");
          didRegister = true;
          Object.keys(callbackMap).forEach(function (key) {
            const type = Number(key);
            validateCallbackType(type);
            const result = raw.startCallback(type);
            if (result.status === STATUS_ERROR) throw nativeError("startCallback");
            activeTypes.push(type);
          });
        }
        const result = raw.run();
        const metadata = this._setLast(result.status, "run");
        return {
          status: metadata.status,
          warnings: metadata.warnings,
          modelStatus: raw.getModelStatus(),
        };
      } finally {
        try {
          for (let index = 0; index < activeTypes.length; index++)
            raw.stopCallback(activeTypes[index]);
        } finally {
          if (didRegister) raw.setCallback(undefined);
        }
      }
    }

    clear(...args: any[]) {
      return this._status("clear", args);
    }

    clearModel(...args: any[]) {
      return this._status("clearModel", args);
    }

    clearSolver(...args: any[]) {
      return this._status("clearSolver", args);
    }

    releaseMemory(...args: any[]) {
      return this._status("releaseMemory", args);
    }

    readModel(...args: any[]) {
      return this._status("readModel", args);
    }

    passModel(...args: any[]) {
      return this._status("passModel", args);
    }

    passHessian(...args: any[]) {
      return this._status("passHessian", args);
    }

    passLinearObjectives(...args: any[]) {
      return this._status("passLinearObjectives", args);
    }

    addLinearObjective(...args: any[]) {
      return this._status("addLinearObjective", args);
    }

    clearLinearObjectives(...args: any[]) {
      return this._status("clearLinearObjectives", args);
    }

    presolve(...args: any[]) {
      return this._status("presolve", args);
    }

    postsolve(...args: any[]) {
      return this._status("postsolve", args);
    }

    zeroAllClocks(...args: any[]) {
      return this._status("zeroAllClocks", args);
    }

    addVar(...args: any[]) {
      return this._status("addVar", args);
    }

    addVars(...args: any[]) {
      return this._status("addVars", args);
    }

    addCol(...args: any[]) {
      return this._status("addCol", args);
    }

    addCols(...args: any[]) {
      return this._status("addCols", args);
    }

    addRow(...args: any[]) {
      return this._status("addRow", args);
    }

    addRows(...args: any[]) {
      return this._status("addRows", args);
    }

    ensureColwise(...args: any[]) {
      return this._status("ensureColwise", args);
    }

    ensureRowwise(...args: any[]) {
      return this._status("ensureRowwise", args);
    }

    changeObjectiveSense(...args: any[]) {
      return this._status("changeObjectiveSense", args);
    }

    changeObjectiveOffset(...args: any[]) {
      return this._status("changeObjectiveOffset", args);
    }

    changeColIntegrality(...args: any[]) {
      return this._status("changeColIntegrality", args);
    }

    changeColsIntegrality(...args: any[]) {
      return this._status("changeColsIntegrality", args);
    }

    clearIntegrality(...args: any[]) {
      return this._status("clearIntegrality", args);
    }

    changeColCost(...args: any[]) {
      return this._status("changeColCost", args);
    }

    changeColsCost(...args: any[]) {
      return this._status("changeColsCost", args);
    }

    changeColBounds(...args: any[]) {
      return this._status("changeColBounds", args);
    }

    changeColsBounds(...args: any[]) {
      return this._status("changeColsBounds", args);
    }

    changeRowBounds(...args: any[]) {
      return this._status("changeRowBounds", args);
    }

    changeRowsBounds(...args: any[]) {
      return this._status("changeRowsBounds", args);
    }

    deleteCols(...args: any[]) {
      return this._status("deleteCols", args);
    }

    deleteRows(...args: any[]) {
      return this._status("deleteRows", args);
    }

    scaleCol(...args: any[]) {
      return this._status("scaleCol", args);
    }

    scaleRow(...args: any[]) {
      return this._status("scaleRow", args);
    }

    passColName(...args: any[]) {
      return this._status("passColName", args);
    }

    passRowName(...args: any[]) {
      return this._status("passRowName", args);
    }

    passModelName(...args: any[]) {
      return this._status("passModelName", args);
    }

    crossover(...args: any[]) {
      return this._status("crossover", args);
    }

    feasibilityRelaxation(...args: any[]) {
      return this._status("feasibilityRelaxation", args);
    }

    changeCoefficient(...args: any[]) {
      return this._status("changeCoeff", args);
    }

    getSolution(...args: any[]) {
      return this._value("getSolution", args);
    }

    getBasis(...args: any[]) {
      return this._value("getBasis", args);
    }

    getPrimalRay(...args: any[]) {
      return this._value("getPrimalRay", args);
    }

    getDualRay(...args: any[]) {
      return this._value("getDualRay", args);
    }

    getDualUnboundednessDirection(...args: any[]) {
      return this._value("getDualUnboundednessDirection", args);
    }

    getModel(...args: any[]) {
      return this._value("getModel", args);
    }

    getLp(...args: any[]) {
      return this._value("getLp", args);
    }

    getPresolvedLp(...args: any[]) {
      return this._value("getPresolvedLp", args);
    }

    getIisLp(...args: any[]) {
      return this._value("getIisLp", args);
    }

    getFixedLp(...args: any[]) {
      return this._value("getFixedLp", args);
    }

    getCols(...args: any[]) {
      return this._value("getCols", args);
    }

    getRows(...args: any[]) {
      return this._value("getRows", args);
    }

    getColName(...args: any[]) {
      return this._value("getColName", args);
    }

    getRowName(...args: any[]) {
      return this._value("getRowName", args);
    }

    getPresolvedColName(...args: any[]) {
      return this._value("getPresolvedColName", args);
    }

    getPresolvedRowName(...args: any[]) {
      return this._value("getPresolvedRowName", args);
    }

    getColByName(...args: any[]) {
      return this._value("getColByName", args);
    }

    getRowByName(...args: any[]) {
      return this._value("getRowByName", args);
    }

    getColIntegrality(...args: any[]) {
      return this._value("getColIntegrality", args);
    }

    getBasicVariables(...args: any[]) {
      return this._value("getBasicVariables", args);
    }

    getBasisInverseRow(...args: any[]) {
      return this._value("getBasisInverseRow", args);
    }

    getBasisInverseCol(...args: any[]) {
      return this._value("getBasisInverseCol", args);
    }

    getBasisSolve(...args: any[]) {
      return this._value("getBasisSolve", args);
    }

    getBasisTransposeSolve(...args: any[]) {
      return this._value("getBasisTransposeSolve", args);
    }

    getReducedRow(...args: any[]) {
      return this._value("getReducedRow", args);
    }

    getReducedColumn(...args: any[]) {
      return this._value("getReducedColumn", args);
    }

    getRanging(...args: any[]) {
      return this._value("getRanging", args);
    }

    getIis(...args: any[]) {
      return this._value("getIis", args);
    }
  }
  class OptionStoreImpl {
    private readonly _model: PersistentModel;

    constructor(model) {
      this._model = model;
    }

    set(name, value) {
      if (typeof name === "object" && name) {
        Object.keys(name).forEach(validateOption);
        let aggregate = STATUS_OK;
        Object.keys(name).forEach(
          function (key) {
            const result = this._model.raw.setOptionValue(key, name[key]);
            if (result.status === STATUS_ERROR) throw nativeError("setOptionValue");
            aggregate = Math.max(aggregate, result.status);
          }.bind(this)
        );
        return this._model._setLast(aggregate, "setOptionValue");
      }
      validateOption(name);
      return this._model._status("setOptionValue", [name, value]);
    }

    describe(name) {
      validateOption(name);
      return this._model._value("getOptionValues", [name]);
    }

    reset() {
      return this._model._status("resetOptions");
    }

    export(deviationsOnly) {
      return this._model._value("exportOptions", [deviationsOnly]);
    }

    get(name) {
      validateOption(name);
      return this._model._value("getOptionValue", [name]);
    }

    names() {
      const count = this._model.raw.getNumOptions();
      const names = [];
      for (let index = 0; index < count; index++) {
        const result = this._model.raw.getOptionName(index);
        if (result.status === STATUS_ERROR) throw nativeError("getOptionName");
        if (!isForbiddenOption(result.value)) names.push(result.value);
      }
      return names;
    }

    read(text) {
      validateOptionText(text);
      return this._model._status("readOptions", [text]);
    }
  }

  class InfoStoreImpl {
    private readonly _model: PersistentModel;

    constructor(model) {
      this._model = model;
    }

    get(name) {
      return this._model._value("getInfoValue", [name]);
    }

    type(name) {
      return this._model._value("getInfoType", [name]);
    }
  }

  function createRawModel() {
    const pointer = numericFunction("Highs_create", 0)();
    if (!pointer) throw new Error("Highs_create failed");
    const raw = new RawModel(pointer);
    // These are defense-in-depth. A HIGHS_NO_DEFAULT_THREADS build may reject
    // one or both options, which is harmless because no scheduler exists.
    stringFunction("Highs_setIntOptionValue", 1, 1)(pointer, "threads", 1);
    nativeFunction("Highs_setStringOptionValue", "number", [
      "number",
      "string",
      "string",
    ])(pointer, "parallel", "off");
    return raw;
  }

  function createPersistentModel(source) {
    const model = new PersistentModel(createRawModel());
    try {
      if (source) {
        if (source.format === "lp" || source.format === "mps")
          model.readModel(source);
        else model.passModel(source);
      }
      return model;
    } catch (error) {
      model.dispose();
      throw error;
    }
  }

  function oneShot(name, model) {
    const shape = validateModel(model);
    return withArena(function (arena) {
      const matrix = model.matrix;
      const isMip = name === "Highs_mipCall";
      const colValue = arena.outDoubles(shape.numCols);
      const colDual = isMip ? 0 : arena.outDoubles(shape.numCols);
      const rowValue = arena.outDoubles(shape.numRows);
      const rowDual = isMip ? 0 : arena.outDoubles(shape.numRows);
      const colBasis = isMip ? 0 : arena.outInts(shape.numCols);
      const rowBasis = isMip ? 0 : arena.outInts(shape.numRows);
      const modelStatus = arena.outInts(1);
      const lpPacked = packLpArrays(model, arena, isMip);
      const base = [
        shape.numCols,
        shape.numRows,
        shape.numNonzeros,
        FORMAT[matrix.format],
        shape.sense,
        model.offset == null ? 0 : model.offset,
        ...lpPacked.slice(0, 8),
      ];
      let args;
      if (name === "Highs_mipCall") {
        if (!model.integrality)
          throw validationError("mipCall requires integrality");
        args = base.concat([
          lpPacked[8],
          colValue,
          rowValue,
          modelStatus,
        ]);
      } else if (name === "Highs_qpCall") {
        if (!model.hessian) throw validationError("qpCall requires hessian");
        const hessian = model.hessian;
        args = base.slice(0, 3).concat([
          shape.hessianNonzeros,
          FORMAT[matrix.format],
          HESSIAN_FORMAT[hessian.format],
          shape.sense,
          model.offset == null ? 0 : model.offset,
          ...lpPacked.slice(0, 8),
          arena.ints(Array.prototype.slice.call(hessian.starts, 0, -1)),
          arena.ints(hessian.indices),
          arena.doubles(hessian.values),
          colValue,
          colDual,
          rowValue,
          rowDual,
          colBasis,
          rowBasis,
          modelStatus,
        ]);
      } else {
        args = base.concat([
          colValue,
          colDual,
          rowValue,
          rowDual,
          colBasis,
          rowBasis,
          modelStatus,
        ]);
      }
      const status = numericFunction(name, args.length).apply(null, args);
      if (isMip) {
        return rawResult(status, {
          modelStatus: heap32()[modelStatus >> 2],
          solution: {
            colValue: copyDoubles(colValue, shape.numCols),
            rowValue: copyDoubles(rowValue, shape.numRows),
          },
        });
      }
      return rawResult(status, {
        modelStatus: heap32()[modelStatus >> 2],
        solution: {
          colValue: copyDoubles(colValue, shape.numCols),
          rowValue: copyDoubles(rowValue, shape.numRows),
          colDual: copyDoubles(colDual, shape.numCols),
          rowDual: copyDoubles(rowDual, shape.numRows),
        },
        basis: {
          colStatus: copyInts(colBasis, shape.numCols),
          rowStatus: copyInts(rowBasis, shape.numRows),
        },
      });
    });
  }

  const version = Object.freeze({
    major: numericFunction("Highs_versionMajor", 0)(),
    minor: numericFunction("Highs_versionMinor", 0)(),
    patch: numericFunction("Highs_versionPatch", 0)(),
    string: nativeFunction("Highs_version", "string", [])(),
    gitHash: nativeFunction("Highs_githash", "string", [])(),
  });

  const constants = Object.freeze({
    status: Object.freeze({ error: -1, ok: 0, warning: 1 }),
    variableType: Object.freeze({
      continuous: 0,
      integer: 1,
      semiContinuous: 2,
      semiInteger: 3,
      implicitInteger: 4,
    }),
    objectiveSense: Object.freeze({ minimize: 1, maximize: -1 }),
    matrixFormat: Object.freeze({ columnWise: 1, rowWise: 2 }),
    hessianFormat: Object.freeze({ triangular: 1, square: 2 }),
    optionType: Object.freeze({ boolean: 0, integer: 1, double: 2, string: 3 }),
    infoType: Object.freeze({ int64: -1, integer: 1, double: 2 }),
    solutionStatus: Object.freeze({ none: 0, infeasible: 1, feasible: 2 }),
    basisValidity: Object.freeze({ invalid: 0, valid: 1 }),
    basisStatus: Object.freeze({ lower: 0, basic: 1, upper: 2, zero: 3, nonbasic: 4 }),
    callbackType: Object.freeze({
      logging: 0,
      simplexInterrupt: 1,
      ipmInterrupt: 2,
      mipSolution: 3,
      mipImprovingSolution: 4,
      mipLogging: 5,
      mipInterrupt: 6,
      mipCutPool: 7,
      mipUserSolution: 9,
    }),
    presolveStatus: Object.freeze({
      notPresolved: -1,
      notReduced: 0,
      infeasible: 1,
      unboundedOrInfeasible: 2,
      reduced: 3,
      reducedToEmpty: 4,
      timeout: 5,
      nullError: 6,
      optionsError: 7,
      outOfMemory: 8,
    }),
    modelStatus: Object.freeze({
      notSet: 0,
      loadError: 1,
      modelError: 2,
      presolveError: 3,
      solveError: 4,
      postsolveError: 5,
      empty: 6,
      optimal: 7,
      infeasible: 8,
      unboundedOrInfeasible: 9,
      unbounded: 10,
      objectiveBound: 11,
      objectiveTarget: 12,
      timeLimit: 13,
      iterationLimit: 14,
      unknown: 15,
      solutionLimit: 16,
      interrupted: 17,
    }),
    iis: Object.freeze({
      strategyLight: 0,
      strategyRowPriority: 6,
      strategyColPriority: 14,
      boundFree: 1,
      boundLower: 2,
      boundUpper: 3,
      boundBoxed: 4,
      notInConflict: -1,
      maybeInConflict: 0,
      inConflict: 1,
    }),
  });

  const probe = createRawModel();
  const infinity = probe.getInfinity();
  const intBytes = probe.getSizeofHighsInt();
  probe.dispose();
  if (intBytes !== 4)
    throw new Error(
      "This highs-js runtime requires a 32-bit HighsInt build; received " +
        intBytes * 8 +
        " bits"
    );

  Module["version"] = version;
  Module["infinity"] = infinity;
  Module["intBytes"] = intBytes;
  Module["intBits"] = intBytes * 8;
  Object.defineProperty(Module, "memoryBytes", {
    enumerable: true,
    get: function () {
      return heapU8().buffer.byteLength;
    },
  });
  Module["constants"] = constants;
  Module["errors"] = Object.freeze({
    HighsError,
    HighsDisposedError,
    HighsValidationError,
    HighsReentrancyError,
    HighsUnsupportedOptionError,
  });
  Module["createModel"] = createPersistentModel;
  Module["raw"] = Object.freeze({
    version: function () {
      return version;
    },
    lpCall: function (model) {
      return oneShot("Highs_lpCall", model);
    },
    mipCall: function (model) {
      return oneShot("Highs_mipCall", model);
    },
    qpCall: function (model) {
      return oneShot("Highs_qpCall", model);
    },
    createModel: createRawModel,
  });
})(Module);
