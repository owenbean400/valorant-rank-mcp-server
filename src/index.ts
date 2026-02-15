import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const USERNAME = process.env.username ?? "Unknown";
const VALORANT_API_BASE = process.env.api_base ?? "";

// Create server instance
const server = new McpServer({
  name: `${USERNAME} Valorant Date`,
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Helper function for making NWS API requests
async function makeValorantRequest<T>(url: string): Promise<T | null> {
  const headers = {
    Accept: "application/json",
  };

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error(`Error making ${USERNAME} Valorant request:`, error);
    return null;
  }
}

interface ValorantRankStats {
    score: number;
    kills: number;
    deaths: number;
    assists: number;
    bodyshots: number;
    headshots: number;
    legshots: number;
    damage_made: number;
    damage_received: number;
}

interface ValorantRankGame {
    puuid: string;
    match_id: string;
    raw_date_int: number;
    date: string;
    mmr_change_to_last_game: number;
    map: string;
    character: string;
    stats: ValorantRankStats;
    rounds_won: number;
    rounds_lost: number;
}

interface ValorantRankHistoryLastFetchKeys {
    last_eval_key_puuid_match: string;
    last_eval_key_raw_date_int: number;
}

interface ValorantRankApi {
    rank_history: Array<ValorantRankGame>;
    last_eval_keys: ValorantRankHistoryLastFetchKeys
}

function formatValorantRank(game: ValorantRankGame): string {
  return [
    `Match ID: ${game.match_id || "Unknown"}`,
    `Date: ${game.date || "Unknown"}`,
    `Character: ${game.character || "Unknown"}`,
    `Map: ${game.map || "Unknown"}`,
    `RR Change: ${(game.mmr_change_to_last_game > -50 && game.mmr_change_to_last_game < 50) ? game.mmr_change_to_last_game.toString(10) : "Unknown"}`,
    `Rounds Won: ${(game.rounds_won >= 0) ? game.rounds_won.toString(10) : "Unknown"}`,
    `Rounds Lost: ${(game.rounds_lost >= 0) ? game.rounds_lost.toString(10) : "Unknown"}`,
    `Score: ${(game.stats.score >= 0) ? game.stats.score.toString(10) : "Unknown"}`,
    `Kills: ${(game.stats.kills >= 0) ? game.stats.kills.toString(10) : "Unknown"}`,
    `Deaths: ${(game.stats.deaths >= 0) ? game.stats.deaths.toString(10) : "Unknown"}`,
    `Assists: ${(game.stats.assists >= 0) ? game.stats.assists.toString(10) : "Unknown"}`,
    `Body Shots: ${(game.stats.bodyshots >= 0) ? game.stats.bodyshots.toString(10) : "Unknown"}`,
    `Head Shots: ${(game.stats.headshots >= 0) ? game.stats.headshots.toString(10) : "Unknown"}`,
    `Leg Shots: ${(game.stats.legshots >= 0) ? game.stats.legshots.toString(10) : "Unknown"}`,
    `Damage Made: ${(game.stats.damage_made >= 0) ? game.stats.damage_made.toString(10) : "Unknown"}`,
    `Damage Received: ${(game.stats.damage_received >= 0) ? game.stats.damage_received.toString(10) : "Unknown"}`,
    "---",
  ].join("\n");
}

server.tool(
    `get_${USERNAME}_valorant_rank_history`,
    `Get ${USERNAME}'s Latest Valorant Rank History`,
  {
    pageNumber: z.number().min(1).max(10).describe("The number of valorant rank history records to fetch"),
  },
  async ({ pageNumber }) => {
    const rankHistoryUrl = `${VALORANT_API_BASE}/history?pageLength=${pageNumber}`;
    const rankHistoryData = await makeValorantRequest<ValorantRankApi>(rankHistoryUrl);

    if (!rankHistoryData) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to retrieve ${USERNAME}'s Valorant rank history data "${rankHistoryData}" with API call ${rankHistoryUrl}`,
          },
        ],
      };
    }

    const games = rankHistoryData.rank_history || [];
    if (games.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No Valorant rank history data",
          },
        ],
      };
    }

    const formattedRankHistory = games.map(formatValorantRank);
    const outputText = `${USERNAME}'s Valorant rank history data below from last ${pageNumber.toString(10)} games with last evaluated PUUID key of ${rankHistoryData.last_eval_keys.last_eval_key_puuid_match} and last evaluated raw date int key of ${rankHistoryData.last_eval_keys.last_eval_key_raw_date_int.toString(10)}.:\n\n${formattedRankHistory.join("\n")}`;

    return {
      content: [
        {
          type: "text",
          text: outputText,
        },
      ],
    };
  }
)

server.tool(
    `get_more_${USERNAME}_valorant_rank_history`,
    `Get ${USERNAME}'s latest Valorant rank history from last evaluated keys for another page of data`,
  {
    pageNumber: z.number().min(1).max(10).describe("The number of valorant rank history records to fetch."),
    lastEvalPuuidKey: z.string().length(36).describe("The last evalated puuid key from previous Valorant rank history fetch."),
    lastEvalRawDateInt: z.number().min(0).describe("The last evalated raw date int key from previous Valorant rank history fetch."),
  },
  async ({ pageNumber, lastEvalPuuidKey, lastEvalRawDateInt }) => {
    const rankHistoryUrl = `${VALORANT_API_BASE}/history?pageLength=${pageNumber}&lastEvalKeyPuuidMatch=${lastEvalPuuidKey}&lastEvalKeyRawDateInt=${lastEvalRawDateInt}`;
    const rankHistoryData = await makeValorantRequest<ValorantRankApi>(rankHistoryUrl);

    if (!rankHistoryData) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to retrieve ${USERNAME}'s Valorant rank history data with response "${rankHistoryData}" with API call ${rankHistoryUrl}`,
          },
        ],
      };
    }

    const games = rankHistoryData.rank_history || [];
    if (games.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No Valorant rank history data",
          },
        ],
      };
    }

    const formattedRankHistory = games.map(formatValorantRank);
    const outputText = `${USERNAME}'s Valorant rank history data below from last ${pageNumber.toString(10)} games with last evaluated PUUID key of ${rankHistoryData.last_eval_keys.last_eval_key_puuid_match} and last evaluated raw date int key of ${rankHistoryData.last_eval_keys.last_eval_key_raw_date_int.toString(10)}.:\n\n${formattedRankHistory.join("\n")}`;

    return {
      content: [
        {
          type: "text",
          text: outputText,
        },
      ],
    };
  }
)

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${USERNAME} Valorant rank history MCP Server running on stdio`);
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});