export interface IOptions {
  select?: string[];
  orderBy?: string | Array<Array<string>>;
  filter?: Array<Array<string> | string>;
  expand?: Array<{ name: string; select: string[] }>;
  top?: number;
  skiptoken?: string
}

const stringify = ({ select, orderBy, filter, expand, top, skiptoken }: IOptions) => {
  let query = [];

  if (select && select.length > 0) {
    query.push(`$select=${select.join(",")}`);
  }
  if (filter && filter.length > 0) {
    query.push(
      `$filter=${filter
        .map((item, index) => {
          if (index % 2 === 1 && typeof item !== "string") {
            throw Error("Filter should be joint using 'and' or 'or'");
          }
          if (Array.isArray(item)) {
            return item.join(" ");
          } else {
            return ` ${item} `;
          }
        })
        .join("")}`
    );
  }
  if (orderBy) {
    if (typeof orderBy === "string") {
      query.push(`$orderby=${orderBy} asc`);
    } else {
      query.push(`$orderby=${orderBy.map((item) => item.join(" ")).join(",")}`);
    }
  }

  if (expand && expand.length > 0) {
    query.push(
      `$expand=${expand
        .map((e) => `${e.name}($select=${e.select.join(",")})`)
        .join(",")}`
    );
  }

  if (top) {
    query.push(`$top=${top}`);
  }

  if (skiptoken) {
    query.push(`$skiptoken=${skiptoken}`)
  }

  if (query.length === 0) {
    return "";
  } else {
    return `?${query.join("&")}`;
  }
};

export default stringify;
