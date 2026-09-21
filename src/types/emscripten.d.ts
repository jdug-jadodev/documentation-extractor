interface EmscriptenModule {
  locateFile?(path: string, prefix?: string): string;
  print?(text: string): void;
  printErr?(text: string): void;
}
