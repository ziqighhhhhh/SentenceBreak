import path from "path";

export function resolveClientDistPath(serverDirname: string): string {
  const serverDir = path.basename(serverDirname);

  if (serverDir === "dist-server") {
    return path.resolve(serverDirname, "..", "dist");
  }

  return path.resolve(serverDirname, "dist");
}
