declare module 'pdf-parse' {
  function pdf(dataBuffer: Buffer | Uint8Array, options?: any): Promise<{
    text: string;
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    version: string;
  }>;
  export default pdf;
}
