type WithHeaders = { headers: unknown };

export const merge = (...objs: any[]) => {
  const headers = objs
    .filter((obj): obj is WithHeaders =>
      typeof obj === 'object' && obj ? !!obj.headers : false,
    )
    .map((obj) => obj.headers);

  return headers.length > 0
    ? Object.assign({}, ...objs, { headers: Object.assign({}, ...headers) })
    : Object.assign({}, ...objs);
};
