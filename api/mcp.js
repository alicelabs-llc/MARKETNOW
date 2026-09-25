// Compatibility entrypoint.
// The canonical remote MCP implementation lives in aep-marketplace/api/mcp.js.
// Keep this root route as a thin re-export so deployments that use the repository
// root cannot silently expose a stale, reduced MCP contract.
export { default } from "../aep-marketplace/api/mcp.js";
