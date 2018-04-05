const cluster = require('cluster')
const dgram = require('dgram')
const express = require('express')
const crypt = require('crypto-js')
const parser = require('body-parser')
const request = require('request');
const transaction = {
  "From": "Trung",
  "To": "Hieu",
  "Amount": 100
};


class Block {
  constructor(index, previousHash, timestamp, data, hash, nonce) {
    this.index = index
    this.previousHash = previousHash.toString()
    this.timestamp = timestamp
    this.data = data
    this.hash = hash.toString()
    this.nonce = nonce;
  }
}

class Server {
  constructor() {
    this.blocks = [new Block(0, '0', new Date(), '', "816534932c2b7154836da6afc367695e6337db8a921823784c14378abed4f7d7", 0)] //Genesis block
    this.peers = {}

    // Peer discovery server
    this.peerServer = dgram.createSocket('udp4')
    this.peerServer.on('listening', this.onPeerServerListening.bind(this))
    this.peerServer.on('message', this.onPeerMessage.bind(this));

    // RPC server
    this.httpServer = express();
    this.httpServer.use(parser.json());
    // TODO: API to show know peers
    this.httpServer.get('/peers', this.showPeers.bind(this));
    this.httpServer.post('/maketransaction', this.handleTransaction.bind(this));

    //API to show current blockchain
    this.httpServer.get('/blocks', this.showBlockChain.bind(this));
  }

  showBlockChain(req, res) {
    res.send(this.blocks);
  }

  showPeers(req, res) {
    res.json(this.peers);
    console.log(JSON.stringify(this.peers));
  }

  handleTransaction(req, res) {
    var txData = transaction;
    var newBlock = this.createBlock(txData);
    this.peerServer.setBroadcast(true);
    this.peerServer.send(Buffer.from(JSON.stringify({ message: "New Block", block: newBlock })),
      this.peerServer.address().port, '172.16.0.0', (err) => { })
    res.send('Mined successfully! Waiting for confirmed!')
  }

  getLatestBlock() { return this.blocks[this.blocks.length - 1]; }

  createBlock(blockData) {
    var latestBlock = this.getLatestBlock();
    var newIndex = latestBlock.index + 1;
    var newTimestamp = Date.now();
    var newBlock = this.mineNewBlock(latestBlock, newIndex, newTimestamp, blockData);
    return newBlock;
  }

  mineNewBlock(latestBlock, newIndex, newTimestamp, blockData) {
    var nonce = 0
    var newHash = ''
    while (true) {
      newHash = this.calculateHash(newIndex, latestBlock.hash, newTimestamp, blockData, nonce);
      if (newHash.substring(0, 2) !== '00') {
        nonce += 1;
      } else { return new Block(newIndex, latestBlock.hash, newTimestamp, blockData, newHash, nonce) }
    }
  }

  calculateHash(index, previousHash, timestamp, data, nonce) {
    return crypt.SHA256(index + previousHash + timestamp + data + nonce).toString()
  }

  validateBlock(newBlock, latestBlock) {
    if (newBlock.index !== latestBlock.index + 1) {
      console.log(newBlock);
      console.log('Error index!');
      return false;
    }
    else if (newBlock.previousHash !== latestBlock.hash) {
      console.log('Error previous hash!');
      return false;
    }
    else if (this.calculateHash(newBlock.index, newBlock.previousHash, newBlock.timestamp, newBlock.data, newBlock.nonce) !== newBlock.hash) {
      console.log('Error new hash!');
      return false;
    }
    return true;
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

    const message = Buffer.from('hello');
    this.peerServer.setBroadcast(true);
    this.peerServer.send(message, address.port, '172.16.0.0', (err) => { });
    // TODO: broadcast 'hello' message to subnet '172.16.0.0'
  }

  onPeerMessage(message, remote) {
    // TODO: Check if the message is 'hello'    
    if (message.toString('utf8') === 'hello') {
      // TODO: Add the peer's address to `this.peers`, if it's not there already
      if (!this.peers.hasOwnProperty(`${remote.address}`)) {
        console.log(`Peer discovered: ${remote.address}:${remote.port}`);
        this.peers[`${remote.address}`] = remote.port;
        const reply = Buffer.from('hello');
        // TODO: Reply to the peer with the same 'hello' message
        this.peerServer.send(reply, remote.port, remote.address, (err) => { });
      }
    }
    //Check the broadcast message when some node mined a block successfully and confirm it
    if (message.toString().includes('New Block')) {
      var newBlock = JSON.parse(message.toString()).block;
      var latestBlock = this.blocks[this.blocks.length - 1];
      if (this.validateBlock(newBlock, latestBlock)) {
        this.blocks.push(newBlock);
        console.log('Block ' + newBlock.index + ' is confirmed!');
      }
      else {
        console.log('Block ' + newBlock.index + ' is not confirmed!');
      }
    }
  }
}

exports.Block = Block;
exports.Server = Server;