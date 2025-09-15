const express = require("express");
const http = require("http");
const { Server, LobbyRoom } = require("colyseus");
const { Schema, type } = require("@colyseus/schema");

// --- Define Player Schema ---
class Player extends Schema {
  @type("string") id;
  @type("string") name;
  @type("number") x = 0;
  @type("number") y = 0;
}

// --- Define Game State ---
class GameState extends Schema {
  @type([Player]) players = [];
}

// --- Define Game Room ---
class GameRoom extends require("colyseus").Room {
  onCreate(options) {
    this.setState(new GameState());
    this.maxClients = 2;

    this.password = options.password || null;

    this.onMessage("move", (client, data) => {
      const player = this.state.players.find(p => p.id === client.sessionId);
      if (player) {
        player.x = data.x;
        player.y = data.y;
      }
    });
  }

  onAuth(client, options) {
    if (this.password && this.password !== options.password) {
      throw new Error("Invalid password");
    }
    return true;
  }

  onJoin(client, options) {
    const player = new Player();
    player.id = client.sessionId;
    player.name = options.name || "Guest";
    this.state.players.push(player);
    console.log(`${player.name} joined room ${this.roomId}`);
  }

  onLeave(client) {
    this.state.players = this.state.players.filter(p => p.id !== client.sessionId);
  }
}

// --- Setup Express + Colyseus ---
const app = express();
const server = http.createServer(app);
const gameServer = new Server({ server });

// built-in lobby room
gameServer.define("lobby", LobbyRoom);

// our custom room
gameServer.define("game", GameRoom).enableRealtimeListing();

const PORT = process.env.PORT || 3000;
gameServer.listen(PORT);
console.log("Server running on port " + PORT);
