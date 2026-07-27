import loadHighs, { type ModelData, type SymbolDisposable } from "../types";

async function exerciseDisposableContract(modelData: ModelData) {
  const highs = await loadHighs();

  {
    using model = highs.createModel(modelData);
    using rawView = model.raw;
    model.getDimensions();
    rawView.getDimensions();
  }

  {
    using raw = highs.raw.createModel();
    raw.getDimensions();
  }

  const annotated: SymbolDisposable<ReturnType<typeof highs.createModel>> =
    highs.createModel();
  annotated.dispose();
}

void exerciseDisposableContract;
