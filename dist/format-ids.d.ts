export type OutputFormat = 'html' | 'pdf' | 'pptx' | 'key';
export declare const OUTPUT_FORMATS: readonly OutputFormat[];
export declare const isOutputFormat: (value: string) => value is OutputFormat;
