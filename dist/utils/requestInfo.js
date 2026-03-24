import { UAParser } from "ua-parser-js";
import geoip from "geoip-lite";
export function extractRequestMetadata(req) {
    // Extract IP Address
    const ipAddress = extractIpAddress(req);
    // Extract device name (Browser, OS)
    const deviceName = extractDeviceName(req);
    // Extract location (City, Country)
    const location = extractLocation(ipAddress);
    return {
        ipAddress,
        location,
        deviceName,
    };
}
function extractIpAddress(req) {
    const forwardedFor = req.headers["x-forwarded-for"];
    const realIp = req.headers["x-real-ip"];
    const rawIp = (typeof forwardedFor === "string" ? forwardedFor : "") ||
        (typeof realIp === "string" ? realIp : "") ||
        (req.ip ?? "") ||
        (req.socket.remoteAddress ?? "") ||
        "";
    return rawIp;
}
function extractDeviceName(req) {
    const userAgent = req.headers["user-agent"] || "";
    const parser = new UAParser(userAgent);
    const result = parser.getResult();
    const browser = result.browser.name || "Unknown Browser";
    const os = result.os.name || "Unknown OS";
    return `${browser}, ${os}`;
}
function extractLocation(ipAddress) {
    const geo = geoip.lookup(ipAddress);
    if (!geo) {
        return "Unknown Location";
    }
    const city = geo.city || null;
    const country = geo.country || null;
    if (city && country) {
        return `${city}, ${country}`;
    }
    return country || "Unknown Location";
}
//# sourceMappingURL=requestInfo.js.map