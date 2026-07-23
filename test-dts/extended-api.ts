import loadHighs, {
  type HighsStatus,
  type IndexSelection,
  type LegacyHighsOptions,
  type ModelData,
} from "../highs";

const modelData = {
  numCols: 2,
  numRows: 1,
  sense: -1,
  colCost: new Float64Array([1, 2]),
  colLower: [0, 0],
  colUpper: [Infinity, Infinity],
  rowLower: [-Infinity],
  rowUpper: [4],
  matrix: {
    format: "csc",
    numRows: 1,
    numCols: 2,
    starts: new Int32Array([0, 1, 2]),
    indices: new Int32Array([0, 0]),
    values: new Float64Array([1, 2]),
  },
} satisfies ModelData;

const legacyThreadOptions: LegacyHighsOptions = {
  threads: 1,
  parallel: "off",
};
void legacyThreadOptions;

const selections: IndexSelection[] = [
  { kind: "range", from: 0, to: 1 },
  { kind: "set", indices: new Int32Array([0, 1]) },
  { kind: "mask", mask: new Uint8Array([1, 0]) },
];

async function exerciseContract() {
  const highs = await loadHighs();
  highs.solve("Minimize\nEnd", legacyThreadOptions);
  const model = highs.createModel(modelData);
  const raw = highs.raw.createModel();

  for (const selection of selections) model.getCols(selection);
  const detached: Float64Array = model.getModel().colCost;
  const status: HighsStatus = raw.passModel(modelData).status;
  const int64AwareInfo: number | bigint = model.info.get("mip_node_count");
  void detached;
  void status;
  void int64AwareInfo;

  model.readModel({ format: "lp", data: "Minimize\nEnd" });
  model.options.set("output_flag", false);
  model.run({
    [highs.constants.callbackType.logging](event) {
      // @ts-expect-error logging callbacks cannot interrupt the solver
      event.interrupt();
    },
    [highs.constants.callbackType.simplexInterrupt](event) {
      event.interrupt();
    },
  });

  model.run({
    // @ts-expect-error callbacks must not return a Promise
    [highs.constants.callbackType.logging]: async () => undefined,
  });

  // Untagged selections are deliberately ambiguous and unsupported.
  // @ts-expect-error
  model.getCols([0, 1]);
  // Public I/O accepts data, never virtual-filesystem paths.
  // @ts-expect-error
  model.readModel("model.lp");
  // Zero-copy and arbitrary C-function escape hatches are intentionally absent.
  // @ts-expect-error
  model.getCoefficient(0, 0);
  // @ts-expect-error
  highs.raw.call("Highs_run", 0);

  raw.dispose();
  model.dispose();
}

void exerciseContract;
