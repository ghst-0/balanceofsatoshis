# Balance of Satoshis

Commands for working with LND balances.

[![npm version](https://badge.fury.io/js/balanceofsatoshis.svg)](https://badge.fury.io/js/balanceofsatoshis)

Supported LND versions:

- v0.20.0-beta
- v0.19.0-beta to v0.19.3-beta
- v0.18.0-beta to v0.18.5-beta
- v0.17.0-beta to v0.17.5-beta
- v0.16.0-beta to v0.16.4-beta
- v0.15.2-beta to v0.15.5-beta

## Install

- Requires an [installation of Node v20+][nodejs-install-guide]

```shell
npm install -g balanceofsatoshis
```

Or use a platform-specific guide:

- [RaspiBlitz install guide][raspiblitz-install-guide]
- [RaspiBolt/Debian guide][raspibolt-install-guide]
- [Umbrel install guide][umbrel-install-guide]

If you want to try out any command without npm install, you can also do `npx
balanceofsatoshis` to run a command directly.

Get the version to verify that it's installed:

```shell
bos --version
# current installed version
``` 

Re-install if you want to update to a new version.

## Usage

To see a list of available options and flags run: 
 
```shell
bos help

# Or get individual help with a command
bos help commandName
```

## Community

Use `bos trade-secret` and buy the secret
`626f73ff0001010425002302210288be11d147e1525f7f234f304b094d6627d2c70f3313d7ba3696887b261c4447`
to gain access to the private Telegram group.

Or if you can't use bos yet you can ask about it on the
[public group](https://t.me/balanceofsatoshis)

### Example Commands

```shell
# See an accounting formatted list of various types of transactions
bos accounting "category"

# See total balance, including pending funds, excluding future commit fees
bos balance

# Get the number of days the node cert remains valid
bos cert-validity-days

# See the current fee estimates confirmation targets
bos chainfees

# Show chain fees paid
bos chart-chain-fees

# Show routing fees earned
bos chart-fees-earned

# Show routing fees paid
bos chart-fees-paid

# Show a chart of payments received
bos chart-payments-received

# See details on how closed channels resolved on-chain
bos closed

# Export credentials
bos credentials

# View outbound fee rates and update outbound fee rates to peers
bos fees

# Query the node to find something like a payment, channel or node
bos find "query"

# Output a summarized version of peers forwarded towards
bos forwards

# See help about a command
bos help "command"

# Look up the channels and fee rates of a node by its public key
bos graph "pubkey"

# Output the sum total of remote channel liquidity
bos inbound-liquidity

# Enforce rules on inbound channels
bos inbound-channel-rules

# View and adjust list of saved nodes
bos nodes

# Outputs the sum total of local channel liquidity
bos outbound-liquidity

# Pay a payment request (invoice), probing first
bos pay "payment_request"

# Show channel-connected peers
bos peers

# Output the price of BTC
bos price

# Test if funds can be sent to a destination
bos probe "payment_request/public_key"

# Get a general report of the node activity
bos report

# Send funds using keysend and an optional message to a node
bos send

# Connect up to a Telegram bot
bos telegram

# Show unspent coin outputs
bos utxos
```

## Community HowTos:

- The `accounting` [command howto](https://yalls.org/articles/97d67df1-d721-417d-a6c0-11d793739be9:0965AC5E-56CD-4870-9041-E69616660E6F/bc71e6bf-f2aa-4bae-a3e8-b12e7be2284c)
- The `open` [command howto](https://satbase.org/bos-open/)
- Running `telegram` [via nohup/tmux howto](https://web.archive.org/web/20240711203839/https://plebnet.wiki/wiki/Umbrel_-_Installing_BoS#Installing_Telegram_Bot)
- Running `telegram` [via systemd](https://github.com/ziggie1984/miscellanous/blob/97c4905747fe23a824b6e53dc674c4a571ac0f5c/automation_telegram_bot.md)
- Documentation for bos commands [commands howto](https://github.com/niteshbalusu11/BOS-Commands-Document#balance-of-satoshis-commands)

Want to stack some sats? Write your own LN paywalled guide!

## Nodes

By default `bos` expects `tls.cert` in the root of the default `lnd` directory
and `admin.macaroon` in `<default_lnd_dir>/data/chain/bitcoin/<network>`.

Default LND directories:
* macOS: `~/Library/Application Support/Lnd/`
* Linux: `~/.lnd/`

It will check first for a mainnet macaroon, then a testnet macaroon.

The LND directory can be overriden with an environment variable:

`BOS_DEFAULT_LND_PATH=/path/to/lnd/data/dir`

### Saved Nodes

If you have another node and it is already using `balanceofsatoshis`, you can
add it as a "saved node" using `bos nodes --add`.

Otherwise you can copy the credentials into a saved nodes directory:

To use `bos` with arbitrary external nodes (or nodes with custom
configuration), two things need to be done:

1. Create directory `~/.bos/`, and add node credentials in a format of: 

    `~/.bos/YOUR_NODE_NAME/credentials.json`

Use any shorthand you'd like when choosing this profile node name

2. Each file should have the following format:

```json
{
  "cert": "base64 tls.cert value",
  "macaroon": "base64 .macaroon value",
  "socket": "host:port"
}
```

**Note:** `cert` and (admin) `macaroon` should have base64-encoded, and newline-stripped content of the files. To get the strings in appropriate format you can run, ex:

```bash
# For `cert`
base64 -w0 ~/.lnd/tls.cert

# For `macaroon`
base64 -w0 ~/.lnd/data/chain/bitcoin/mainnet/admin.macaroon
```

**Note_2:** `socket` should contain `host:port` pointing to `lnd`'s gRPC interface, `localhost:10009` by convention.
 
You can also set `cert_path` and `macaroon_path` to the path of the relevant
files instead.

The BOS directory path can be overriden with an environment variable:

`BOS_DATA_PATH=/path/to/bos/data/dir`

#### Umbrel Saved Node

*Note: Umbrel is not FOSS software, use at your own risk.*

If you are using Umbrel and you have already installed but you get an error like
`Name resolution failed for target dns:umbrel.local:10009` then try adding
umbrel.local to your `/etc/hosts` file, like `sudo nano /etc/hosts` and add a line `127.0.0.1 umbrel.local`

1. Identify your Umbrel home dir, like /home/umbrel/umbrel
2. Look in the .env file in that dir for the `LND_IP` to use as the socket to 
    connect to

You can also use umbrel.local if that is in your Umbrel TLS cert but you will 
have to make sure the hostname is known to the client.

```
{
  "cert_path": "/home/umbrel/umbrel/app-data/lightning/data/lnd/tls.cert",
  "macaroon_path": "/home/umbrel/umbrel/app-data/lightning/data/lnd/data/chain/bitcoin/mainnet/admin.macaroon",
  "socket": "LND_IP:10009"
}
```

5. Now when you do a command, specify `--node umbrel` or whatever your dir is: `bos --node umbrel balance`

### Using Saved Nodes
 
To run commands on nodes specified this way, you need to suffix commands with
their name, ex:
 
```shell
bos balance --node=SAVED_NODE_NAME
bos forwards --node=SAVED_NODE_NAME
```

If a saved node is actually your default node, you can set an environment
variable to avoid adding the --node prefix

`export BOS_DEFAULT_SAVED_NODE=nodename`

If that is set, it will use that node if no node is specified.

You can also add a JSON file to your .bos directory: config.json, add
`{"default_saved_node": "nodename"}` to set the default via a file instead

## Linux Fu

Some commands are designed to return outputs that can be piped or used in other CLI programs.

### Open many channels

Make a textfile in the terminal with newline separated pubkeys and the capacity of the channels.

```shell
cat bos_channels.txt

       │ File: bos_channels.txt
───────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   1   │ 0337...1986 --amount=3000000
   2   │ 02a4...20de --amount=3000000
   3   │ 023c...0dec --amount=1000000

```

```shell
bos open $(cat bos_channels.txt)
```

### Summarize Numbers

```shell
expr $(bos balance --node=savedNode1) + $(bos balance --node=savedNode2)
# outputs the combined balance of both nodes
```

### Auto Adjust Fees

```
# Cron every 5 minutes adjust fees
*/5 * * * * /bin/timeout -s 2 30 /home/ubuntu/update-fees.sh
```

update-fees.sh:

```
#!/bin/bash
# Raise the outbound fees to a public key when inbound increases
/home/ubuntu/.npm-global/bin/bos fees --to PUBLIC_KEY --set-fee-rate="IF(INBOUND>10000000,1000,500)"
```

### Auto Balance Liquidity Between Two Nodes

Keep a channel balanced between two of your own nodes

```
# Cron: every 30 minutes send funds to reach 50:50
*/30 * * * * /home/ubuntu/.npm-global/bin/bos send PUBKEY --max-fee 0 --message="rebalance" --amount="IF(OUTBOUND+1*m>(LIQUIDITY/2), OUTBOUND-(LIQUIDITY/2), 0)"
```

If you want to 50:50 rebalance with a peer node, you can use 
`--out-target-inbound=capacity/2` with `bos rebalance`

## Alerts and Reports with `sendnotification`

Some commands are made with the idea that they can trigger an alert or regular
report by piping the output of a command into some reporting script like
[sendnotification](https://www.npmjs.com/package/sendnotification) which works
with AWS SNS service to deliver notifications

Examples of shell scripts that could be executed by crontab:

### Cert Expiration Alert

```shell
# cert-expiration-alert.sh

#!/bin/bash
/path/to/bos cert-validity-days --below 30 | \
/path/to/sendnotification SNS "sns-topic-id" "Warning: %s days left on TLS cert" \
--nonzero --subject="Cert expiration warning"

# sends email when the certification has less than 30 days left until invalid
```

### Daily Node Report

```shell
# daily-report.sh

#!/bin/bash
/path/to/bos report --styled 2>&1 | \
/path/to/sendnotification SNS "sns-topic-id" "%s" --subject="Daily node update"

# sends email about what has happened on the node in the past day
```

### Low Channel Balance Alert

```shell
# low-offchain-outbound-liquidity alert

#!/bin/bash
/path/to/bos balance --offchain --below 4000000 | \
/path/to/sendnotification SNS "sns-topic-id" "off-chain balance deficit: %s sats" \
--nonzero --subject="Low balance warning"

# sends email if the channel balance goes below a threshold
```

### Low Inbound Liquidity Alert

```shell
# low-inbound-liquidity.sh

#!/bin/bash
/path/to/bos inbound-liquidity --below=1000000 2>&1 | \
/path/to/sendnotification SNS "sns-topic-id" \
"WARNING inbound-liquidity deficit: %s sats" --nonzero \
--subject="Low inbound liquidity warning: node1"

# sends email if the inbound liquidity drops below a 1,000,000 sats
```

### Persist Long-Running Commands

If you are running a long-running command and want it to persist, you will need 
something like nohup or tmux to assist you in that and then kill the 
process and restart it when updating.

Nohup example:

```shell
nohup /home/bos/.npm-global/bin/bos telegram --connect CONNECT_CODE > /dev/null &
```

You can also create a shell-script.sh to run a command repeatedly, with a delay

```bash
while true;
do bos rebalance;
sleep 2000;
done
```

## Formulas

Some commands take formula arguments. Formulas are expressions that allow you 
to perform functions and reference variables.

There is a dynamic playground here where you can play with expressions:
https://formulajs.info/functions/

### `--avoid`

In `--avoid` flag commands like rebalance, a formula can be applied
directionally:

`--avoid "fee_rate < 100/<PUBKEY>"` to avoid channels forwarding to the public
key that charge a fee rate under 100 PPM.

Available variables:

- `age`: Age of the channel vs the current height
- `base_fee`: Base fee to be charged to route
- `capacity`: Capacity of the channel
- `fee_rate`: PPM fee to be charged to route
- `height`: Absolute height of the channel
- `opposite_fee_rate`: PPM fee that is charged in the non-routing direction

### `amount`

Formula amounts are supported in the following commands:

- `fund`
- `inbound-channel-rules`
- `open`
- `probe`
- `rebalance`
- `send`

When passing an amount you can pass a formula expression, and the following variables are
defined:

- `k`: 1,000
- `m`: 1,000,000

Examples:

```shell
bos fund <address> "7*m"
// Fund address with value 7,000,000

bos probe <key> "100*k"
// Probe to key amount 100,000

bos send <key> "m/2"
// Push 500,000 to key
```

#### `rebalance`

Rebalance defines additional variables for `--amount`:

-  `capacity`: The total of inbound and outbound

And for `--in-filter` and `--out-filter`:

- `capacity`: The total capacity with the peer
- `heights`: The set of heights of the channels with the peer
- `inbound_fee_rate`: The fee rate the peer is charging
- `inbound_liquidity`: The inbound liquidity with the peer
- `outbound_liquidity`: The outbound liquidity with the peer
- `pending_payments`: The number of pending payments

Example:

```shell
// Rebalance with a target of 1,000,000
bos rebalance --amount "1*m"
```

#### `send`

Send defines additional variables:

- `eur`: The value of 1 Euro as defined by rate provider
- `inbound`: The inbound liquidity with the destination
- `liquidity`: The total capacity with the destination
- `outbound`: The inbound liquidity with the destination
- `usd`: The value of 1 US Dollar as defined by rate provider

Example:

```shell
// Send node $1
bos send <key> --amount "1*usd"
```

#### `transfer`

Transfer variables:

- `out_inbound`: The outbound liquidity with the outbound peer
- `out_liquidity`: The total inbound+outbound with the outbound peer
- `out_outbound`: The total outbound liquidity with the outbound peer

Example:

```shell
// Equalize inbound with a mutual peer
bos transfer node "in_inbound - (in_inbound + out_inbound)/2" --through peer
```

### `fees`

Variables can be referenced for `--set-fee-rate`

- `fee_rate_of_<pubkey>`: Reference other node's fee rate
- `inbound`: Remote balance with peer
- `inbound_fee_rate`: Incoming fee rate
- `outbound`: Local balance with peer

You can also use functions:

- `bips(n)`: Set fee as parts per thousand
- `percent(0.00)`: Set fee as fractional percentage

Example:

```shell
// Set the fee rate to a tag to 1% of the value forwarded
bos fees --to tag --set-fee-rate "percent(1)"
```

### `inbound-channel-rules`

Pass formulas for rules with `--rule`.

Formula variables:

- `capacities`: sizes of the peer's public channels
- `capacity`: size of the inbound channel
- `channel_ages`: block ages of the peer's public channels
- `fee_rates`: outbound fee rates for the peer
- `local_balance`: gifted amount on the incoming channel
- `private`: request is to open an unannounced channel
- `public_key`: key of the incoming peer

Example:

```shell
// Reject channels that are smaller than 2,000,000 capacity
bos inbound-channel-rules --rule "capacity < 2*m"

// Set separate capacity limits depending on private status
bos inbound-channel rules --rule "if(private,capacity >= 9*m,capacity >= 5*m)"
```

[nodejs-install-guide]: https://gist.github.com/alexbosworth/8fad3d51f9e1ff67995713edf2d20126
[raspiblitz-install-guide]: https://gist.github.com/openoms/823f99d1ab6e1d53285e489f7ba38602
[raspibolt-install-guide]: https://raspibolt.org/guide/bonus/lightning/balance-of-satoshis.html
[umbrel-install-guide]: https://web.archive.org/web/20240711203839/https://plebnet.wiki/wiki/Umbrel_-_Installing_BoS
