import Express from "express";
import { getLoginMeta } from "./utils/getLoginInfo.js";
const app = Express();
const PORT = process.env.PORT || 5000;
app.get("/", async (req, res) => {
    const data = await getLoginMeta(req);
    console.log(data);
});
app.get("/health", (req, res) => {
    res.status(200).json({ status: "API is working properly!" });
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map