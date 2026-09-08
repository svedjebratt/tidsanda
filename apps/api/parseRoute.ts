export function parseRoute(route: string) {
  let groups: string[] = [];

  return {
    parse: (matcher: RegExp) => {
      const match = route.match(matcher);
      if (match) {
        groups = match.slice(1);
        return true;
      } else {
        groups = [];
        return false;
      }
    },
    getGroups: () => groups,
  };
}
