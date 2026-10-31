export type Env = ((key: string, defaultValue?: unknown) => any) & {
  int(key: string, defaultValue?: number): number;
  bool(key: string, defaultValue?: boolean): boolean;
  array(key: string, defaultValue?: string[]): string[];
};
