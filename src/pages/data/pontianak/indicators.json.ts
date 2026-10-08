import type { APIRoute } from "astro";
import { loadAtlasData } from "../../../data/load";

export const prerender = true;

export const GET: APIRoute = async () => {
  const data = await loadAtlasData();
  const snapshot = {
    geography: data.geography,
    verifications: data.verifications,
    indicators: data.indicators
  };
  return new Response(`${JSON.stringify(snapshot, null, 2)}\n`, {
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
};
