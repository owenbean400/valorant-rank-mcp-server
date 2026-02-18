import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";

const USERNAME = process.env.username ?? "Unknown";
const VALORANT_API_BASE = process.env.api_base ?? "";
const API_KEY = process.env.api_key ?? "";

// Create server instance
const server = new McpServer({
  name: `${USERNAME} Valorant Date`,
  version: "1.1.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

async function updateValorantRequest(url: string): Promise<string> {

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "authorization": API_KEY
      }
    });

    if (response.status === 500) {
      let errorMsg: ResponseError = await response.json() as ResponseError;

      if (errorMsg.error === "internal error") {
        return "Internal server error from updating Valorant data."
      }

      return "Internal server error from timeout. Make another request again to continue updating Valorant rank data."
    }

    if (response.status === 401) {
      return "The API key setup for server is not configure. Have the user configure the MCP server properly with `api_key` environment key."
    }

    if (response.status === 200) {
      return "Valorant rank history data is up to date."
    }

    return "Unknown response for updating Valorant rank history."
  } catch (error) {
    return "Unknown error for updating Valorant rank history."
  }
}

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

interface ResponseError {
    error: string;
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
    `Get ${USERNAME}'s Latest Valorant Rank History. This is ${USERNAME}'s Valorant rank information.`,
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
    const outputText = `${USERNAME}'s Valorant rank history data below from last ${pageNumber.toString(10)} games with last evaluated PUUID key of ${rankHistoryData.last_eval_keys.last_eval_key_puuid_match} and last evaluated raw date int key of ${rankHistoryData.last_eval_keys.last_eval_key_raw_date_int.toString(10)}:\n\n${formattedRankHistory.join("\n")}`;

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
    `Get ${USERNAME}'s latest Valorant rank history from last evaluated keys for another page of data. This is ${USERNAME}'s Valorant rank information.`,
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
    const outputText = `${USERNAME}'s Valorant rank history data below from last ${pageNumber.toString(10)} games with last evaluated PUUID key of ${rankHistoryData.last_eval_keys.last_eval_key_puuid_match} and last evaluated raw date int key of ${rankHistoryData.last_eval_keys.last_eval_key_raw_date_int.toString(10)}:\n\n${formattedRankHistory.join("\n")}`;

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
  `update_${USERNAME}_valorant_rank_history`,
  `Updates ${USERNAME} Valorant rank history from latest game data from Riot ID. If successful, Valorant rank history will be up to date`,
  {},
  async ({}) => {
    const updateRankHistoryUrl = `${VALORANT_API_BASE}/update`;
    const outputStr = await updateValorantRequest(updateRankHistoryUrl);

    return {
      content: [
        {
          type: "text",
          text: outputStr,
        },
      ],
    };
  }
)

server.tool(
  "valorant_average_combat_score",
  "Calculates Valorant's Average Combat Score (ACS), " + 
  "a key metric that measures a player's overall impact in matches and their contribution toward Rank Rating (RR) gains or losses.",
  {
    roundsWon: z.number().describe("The number of rounds won in a match."),
    roundsLost: z.number().describe("The number of rounds lost in a match."),
    score: z.number().describe("The player's score of the match.")
  },
  ({ roundsWon, roundsLost, score }) => {

    let outputStr = `Average combat score (ACS): ${Math.round(score / (roundsLost + roundsWon))}`

    return {
      content: [
        {
          type: "text",
          text: outputStr,
        },
      ],
    }
  }
)

server.tool(
  "valorant_headshot_percentage",
  "Calculates Valorant's headshot percentage, " + 
  "which highlights a player's aiming precision since headshots deal increased damage. " +
  "However, a high headshot percentage may be less impactful if the player frequently misses non-head shots.",
  {
    headShotCount: z.number().describe("The amount of head shots in a match."),
    bodyShotCount: z.number().describe("The amount of body shots in a match."),
    legShotCount: z.number().describe("The amount of leg shots in a match.")
  },
  ({ headShotCount, bodyShotCount, legShotCount }) => {
    let outputStr = `Headshot percentage (HS%): ${Math.round(headShotCount / (headShotCount + bodyShotCount + legShotCount) * 100)}`

    return {
      content: [
        {
          type: "text",
          text: outputStr,
        },
      ],
    }
  }
)

server.tool(
  "valorant_damage_output_per_round",
  "Calculates Valorant's damage differential per round (DD), also known as delta damage. " +
  "This metric shows the average difference between damage dealt and damage received each round. " +
  "A positive value means the player deals more damage than they take, indicating strong overall impact.",
  {
    roundsWon: z.number().describe("The number of rounds won in a match."),
    roundsLost: z.number().describe("The number of rounds lost in a match."),
    damageMade: z.number().describe("The player's damage made of match."),
    damageReceived: z.number().describe("The player's damage received of match."),
  },
  ({ roundsWon, roundsLost, damageMade, damageReceived }) => {
    let outputStr = `Damage output per round: ${Math.round((damageMade - damageReceived) / (roundsWon + roundsLost))}`

    return {
      content: [
        {
          type: "text",
          text: outputStr,
        },
      ],
    }
  }
)

server.tool(
  "valorant_kill_death_ratio",
  "Calculates Valorant's kill/death ratio (K/D), " + 
  "showing whether a player secures more kills than deaths. " +
   "K/D can be inflated by passive playstyles (e.g., avoiding entry, clutching, or saving), " +
   "so it's most meaningful when combined with a high average kills per round.",
  {
    kills: z.number().describe("The number of kills in a match."),
    deaths: z.number().describe("The number of deaths in a match."),
  },
  ({ kills, deaths }) => {
    let outputStr = `Kills to death ratio (K/D): ${(kills / deaths).toFixed(2)}`

    return {
      content: [
        {
          type: "text",
          text: outputStr,
        },
      ],
    }
  }
)

server.tool(
  "valorant_average_kills_per_round",
  "Calculates Valorant's average kills per round. " + 
  "A high value indicates the player consistently secures eliminations and actively takes engagements.",
  {
    roundsWon: z.number().describe("The number of rounds won in a match."),
    roundsLost: z.number().describe("The number of rounds lost in a match."),
    kills: z.number().describe("The number of kills in a match."),
  },
  ({ roundsWon, roundsLost, kills }) => {
    let outputStr = `Average kills per round: ${(kills / (roundsWon + roundsLost)).toFixed(2)}`

    return {
      content: [
        {
          type: "text",
          text: outputStr,
        },
      ],
    }
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