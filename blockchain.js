const cluster = require('cluster');
const dgram = require('dgram');
const express = require('express');
const cryptoJS = require("crypto-js");
const parser = require('body-parser');
const request = require('request');
const transaction = {
  "Form": "Tung",
  "To": "Dung",
  "Amount": 200
};


class Block {
  constructor(index, previousHash, timestamp, data, nonce, hash) {
    this.index = index;
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.data = data;
    this.nonce = nonce;
    this.hash = hash.toString();
  }
}
var getFirstBlock = () => {
  return new Block(0, "0", 1465154705 , 0, "72117e16e680307de8441247d0ebe9cd792852a4ee9fdc3aac293f120285d7cc");
};

class Server {
  constructor() {
    this.blocks = [getFirstBlock()];
    this.peers = {}

    // Peer discovery server
    this.peerServer = dgram.createSocket('udp4')
    this.peerServer.on('listening', this.onPeerServerListening.bind(this))
    this.peerServer.on('message', this.onPeerMessage.bind(this))

    // RPC server
    this.httpServer = express()
    // TODO: API to show know peers
    this.httpServer.get('/peers', this.showPeers.bind(this));
    // TODO: API to show current blocks
    this.httpServer.get('/blocks', this.showBlocks.bind(this));
    //API to create transaction
    this.httpServer.post('/transaction', this.handleTransaction.bind(this));
     //API to show last block
     this.httpServer.post('/lastBlock', this.showLastBlock.bind(this));
  }
  showLastBlock(req, res) {
    res.json(this.blocks[this.blocks.length - 1]);
  }
  handleTransaction(req, res) {
    var txData = transaction;
  }
  getLastBlock() {
    return this.blocks[this.blocks.length - 1];
  }
  createBlock(blockData) {
    var lastBlock = this.getLastBlock();
    var newIndex = lastBlock.index + 1;
    var newTimestamp = Data.now();
    var newBlock = this.mineNewBlock(lastBlock, newIndex, newTimestamp, blockData);
    if (this.validateBlock(newBlock, lastBlock)) {
      this.blocks.push(newBlock);
      return true;
    } else {
      return false;
    }
  }

  mineNewBlock(lastBlock, newIndex, newTimestamp, blockData) {
    var nonce = 0;
    var newHash = '';
    while (true) {
      newHash = this.calculateHash(newIndex, latestBlock.hash, newTimestamp, blockData, nonce);
      if (newHash.substring(0, 2) !== '00') {
        nonce += 1;
      } else {
        return new Block(newIndex, latestBlock.hash, newTimestamp, blockData, newHash, nonce);
      }
    }
  }

  calculateHash(index, previousHash, timestamp, data, nonce) {
    return cryptoJS.SHA256(index + previousHash + timestamp + data + nonce).toString();
  }

  validateBlock(newBlock, lastBlock) {
    if (newBlock.index !== lastBlock.index + 1) {
      return false;
    } else if (newBlock.previousHash !== lastBlock.hash) {
      return false;
    } else if (this.calculateHash(newBlock.index, newBlock.previousHash, newBlock.timestamp, newBlock.data, newBlock.nonce) !== newBlock.hash) {
      return false;
    } else {
      return true; 
    }
  }

  showPeers(req, res) {
    res.json(this.peers);
    console.log(JSON.stringify(this.peers));
  }

  showBlocks() {
    console.log(JSON.stringify(this.blocks));
  }

  start() {
    if (!cluster.isMaster) return

    // Start peer discovery server
    cluster.fork().on('online', _ => this.peerServer.bind(2346))

    // Start RPC server
    cluster.fork().on('online', _ => this.httpServer.listen(2345, _ => {
      console.info(`RPC server started at 2345.`)
    }))
  }

  onPeerServerListening() {
    const address = this.peerServer.address()
    console.info(
      `Peer discovery server started at ${address.address}:${address.port}.`
    )

    const message = Buffer.from('hello')
    // TODO: broadcast 'hello' message to subnet '172.28.0.0'
    this.peerServer.setBroadcast(true);
    this.peerServer.send(message, 2346 , '172.28.0.0');


  }

  onPeerMessage(message, remote) {
    // TODO: Check if the message is 'hello'
    const bufferCompare = Buffer.from('hello');
    if (message.toString('utf8') === 'hello') {
      if (this.peers[`${remote.address}`]) return;
    // TODO: Add the peer's address to `this.peers`, if it's not there already
    console.log(`Peer discovered: ${remote.address}:${remote.port}`)
    this.peers[`${remote.address}`] = remote.port;
    const reply = Buffer.from('hello')
    // TODO: Reply to the peer with the same 'hello' message
    this.peerServer.send(reply, remote.port, remote.address);
  }

  }
}

exports.Block = Block
exports.Server = Server
