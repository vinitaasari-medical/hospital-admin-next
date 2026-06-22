'use client';
import * as React from "react";

export function useDataTable<T>(initial: T[]) {
  const [data, setData] = React.useState<T[]>(initial);
  const [loading, setLoading] = React.useState(false);
  return { data, setData, loading, setLoading };
}
