
function isEmpty(payload: any): payload is null | undefined | "" | [] | Record<string, never> | void {
  if (payload === null || payload === undefined ) {
    return true;
  }

  if (typeof payload === "string" && payload.trim() === "") {
    return true;
  }

  if (Array.isArray(payload)) {
    return payload.length === 0;
  }

  if (payload instanceof Element) {
    return payload.tagName.toLowerCase() === "empty";
  }

  if (typeof payload === "object" && !Array.isArray(payload)) {
    return Object.keys(payload).length === 0;
  }

  // if needed you could check for other falsy values (e.g. false, NaN)
  if (
    typeof payload === "boolean" ||
    typeof payload === "number" ||
    typeof payload === "bigint"
  ) {
    return false;
  }

  // If it doesn't match any case above, assume it is not empty
  return false;
}


export {isEmpty};
