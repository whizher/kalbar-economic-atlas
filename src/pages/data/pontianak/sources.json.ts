import type { APIRoute } from "astro";
import { loadAtlasData } from "../../../data/load";

export const prerender = true;

export const GET: APIRoute = async () => {
  const data = await loadAtlasData();
  return new Response(`${JSON.stringify(data.sources, null, 2)}\n`, {
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
};
