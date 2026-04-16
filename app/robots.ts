import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: [
          "WhatsApp",
          "facebookexternalhit",
          "Facebot",
          "Twitterbot",
          "LinkedInBot",
          "Slackbot",
          "Discordbot",
          "TelegramBot",
        ],
        allow: "/",
      },
      {
        userAgent: "*",
        disallow: "/",
      },
    ],
  };
}
