import {
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
  ACTIONS_CORS_HEADERS,
} from "@solana/actions";
import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
  clusterApiUrl,
} from "@solana/web3.js";

const headers = {
  ...ACTIONS_CORS_HEADERS,
  "x-action-version": "2.1.3",
  "x-blockchain-ids": "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
};

export async function OPTIONS() {
  return new Response(null, { headers });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  const payload: ActionGetResponse = {
    icon: "https://upload.wikimedia.org/wikipedia/commons/3/34/Solana_cryptocurrency_two.png",
    title: "Support the Project",
    description: "Your SOL donation helps fund continuous open-source development.",
    label: "Donate SOL",
    links: {
      actions: [
        { type: "transaction", label: "0.1 SOL", href: `${baseUrl}/api/donate?amount=0.1` },
        { type: "transaction", label: "0.5 SOL", href: `${baseUrl}/api/donate?amount=0.5` },
        { type: "transaction", label: "1.0 SOL", href: `${baseUrl}/api/donate?amount=1.0` },
        {
          type: "transaction",
          label: "Custom Amount",
          href: `${baseUrl}/api/donate?amount={amount}`,
          parameters: [{ name: "amount", label: "Enter SOL amount" }],
        },
      ],
    },
  };

  return Response.json(payload, { headers });
}

export async function POST(req: Request) {
  try {
    const body: ActionPostRequest = await req.json();
    const donorPubkey = new PublicKey(body.account);

    const url = new URL(req.url);
    const amountStr = url.searchParams.get("amount");
    const amount = parseFloat(amountStr || "0.1");

    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    const DONATION_DESTINATION_WALLET = new PublicKey("{{TREASURY_WALLET}}"); 

    const transferIx = SystemProgram.transfer({
      fromPubkey: donorPubkey,
      toPubkey: DONATION_DESTINATION_WALLET,
      lamports: amount * 1_000_000_000,
    });

    const { blockhash } = await connection.getLatestBlockhash();

    const messageV0 = new TransactionMessage({
      payerKey: donorPubkey,
      recentBlockhash: blockhash,
      instructions: [transferIx],
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);
    const serializedTransaction = Buffer.from(transaction.serialize()).toString("base64");

    const payload: ActionPostResponse = {
      type: "transaction",
      transaction: serializedTransaction,
      message: `Thank you for donating ${amount} SOL!`,
    };

    return Response.json(payload, { headers });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed to build transaction" }, { status: 500, headers });
  }
}