# Valorant MCP Server

A Model Context Protocol (MCP) server for integrating with a local Valorant API server.

* **Valorant API Server Repository:**
  [https://github.com/owenbean400/valorant-rank-aws-api](https://github.com/owenbean400/valorant-rank-aws-api)

---

## Setup

### 1. Install Dependencies

First, confirm that Node.js is installed:

```bash
node --version
```

If Node.js is not installed, download and install it from:
[https://nodejs.org/en](https://nodejs.org/en)

Install project dependencies:

```bash
npm ci
```

Alternatively:

```bash
npm install
```

---

### 2. Build the Project

Compile the TypeScript source into JavaScript:

```bash
npm run build
```

The compiled output will be generated at:

```
build/index.min.js
```

---

## Running with Claude Desktop

1. Open **Claude Desktop**.
2. Navigate to **Settings → Developer**.
3. Open the MCP configuration file.
4. Add your local MCP server configuration.

Below is an example configuration for the Valorant MCP server using the `BeanBaller` account.

For more details, see:
[https://modelcontextprotocol.io/docs/develop/connect-local-servers](https://modelcontextprotocol.io/docs/develop/connect-local-servers)

### Example MCP Configuration

```json
{
  "mcpServers": {
    "BeanBaller Valorant Data": {
      "command": "node",
      "args": ["build\\index.min.js"],
      "env": {
        "username": "BeanBaller",
        "api_base": "https://api.beanballer.com"
      }
    }
  }
}
```

---

# JSON Schema for MCP Configuration

Below is a JSON Schema that validates the example configuration structure:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Claude MCP Configuration",
  "type": "object",
  "required": ["mcpServers"],
  "properties": {
    "mcpServers": {
      "type": "object",
      "minProperties": 1,
      "additionalProperties": {
        "type": "object",
        "required": ["command", "args", "env"],
        "properties": {
          "command": {
            "type": "string",
            "description": "Executable used to start the MCP server"
          },
          "args": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "minItems": 1,
            "description": "Arguments passed to the command"
          },
          "env": {
            "type": "object",
            "required": ["username", "api_base"],
            "properties": {
              "username": {
                "type": "string",
                "description": "Valorant account username"
              },
              "api_base": {
                "type": "string",
                "format": "uri",
                "description": "Base URL of the Valorant API server"
              }
            },
            "additionalProperties": true
          }
        },
        "additionalProperties": false
      }
    }
  },
  "additionalProperties": false
}
```
