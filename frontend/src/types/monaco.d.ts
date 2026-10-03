declare module "monaco-editor/editor/editor.api.js" {
  export * from "monaco-editor";
}

declare module "monaco-editor/editor/editor.worker.js?worker" {
  const worker: { new(): Worker };
  export default worker;
}

declare module "monaco-editor/languages/definitions/python/python.js" {
  export const conf: any;
  export const language: any;
}
