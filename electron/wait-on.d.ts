declare module 'wait-on' {
  function waitOn(opts: { resources: string[]; timeout: number }): Promise<void>
  export default waitOn
}
