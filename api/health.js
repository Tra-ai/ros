import { route } from "../lib/http.js";

export default route(["GET"], (req, res) =>
  res.status(200).json({
    ok: true,
    service: "ROS Revival API",
    realtime: "Use a separate persistent game server for WebSocket matches"
  })
);
