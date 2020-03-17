type WithHeaders = { headers: unknown };

// TODO: do not use `any`
export const merge = (...objs: any[]) => {
  const headers = objs
    .filter((obj): obj is WithHeaders =>
      typeof obj === 'object' && obj ? Boolean(obj.headers) : false,
    )
    .map((obj) => obj.headers);

  return headers.length > 0
    ? Object.assign({}, ...objs, { headers: Object.assign({}, ...headers) })
    : Object.assign({}, ...objs);
};
