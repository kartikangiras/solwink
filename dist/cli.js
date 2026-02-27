#!/usr/bin/env node
import { Command } from "commander";
import consola from "consola";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
// 1. Recreate __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const program = new Command();
program
    .name("solwink")
    .description("The ultimate Solana Blink generator")
    .version("1.0.0");
program.action(async () => {
    consola.box("Welcome to SolWink - The Solana Blink Generator 🌊");
    try {
        // 2. USER INPUTS
        const templateType = await consola.prompt("Which Blink template would you like to scaffold?", {
            type: "select",
            options: [
                { label: "💰 SOL Donation (Crowdfund)", value: "donation" },
                { label: "🖼️ NFT Mint (Metaplex Candy Machine)", value: "nft-mint" },
            ],
        });
        const network = await consola.prompt("Which Solana cluster will this run on?", {
            type: "select",
            options: [
                { label: "Mainnet (Production)", value: "mainnet-beta" },
                { label: "Devnet (Testing)", value: "devnet" },
            ],
        });
        const projectName = await consola.prompt("What is the name of your project?", {
            type: "text",
            default: "my-solwink-app",
        });
        let targetWallet = "";
        let candyMachineId = "";
        if (templateType === "donation") {
            targetWallet = await consola.prompt("Enter the destination treasury wallet address:", {
                type: "text",
            });
        }
        else if (templateType === "nft-mint") {
            candyMachineId = await consola.prompt("Enter your Metaplex Candy Machine ID:", {
                type: "text",
            });
        }
        // 3. DEFINE PATHS (Fixing the "not defined" error)
        const targetPath = path.join(process.cwd(), projectName);
        // This looks for templates relative to the compiled cli.js in /dist
        const templatePath = path.join(__dirname, "..", "templates", templateType);
        // 4. GENERATION LOGIC
        consola.start(`Initializing ${templateType} project in ./${projectName}...`);
        if (!(await fs.pathExists(templatePath))) {
            throw new Error(`Template folder not found at: ${templatePath}`);
        }
        // Map network to Chain ID
        const chainIds = {
            "mainnet-beta": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
            "devnet": "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
        };
        const selectedChainId = chainIds[network];
        // Copy files from template to new project folder
        await fs.copy(templatePath, targetPath);
        // 5. VARIABLE INJECTION
        const routePath = path.join(targetPath, "api", "index.ts");
        if (await fs.pathExists(routePath)) {
            let routeContent = await fs.readFile(routePath, "utf8");
            // Replace Network & Chain ID
            routeContent = routeContent.replace(/{{NETWORK}}/g, network);
            routeContent = routeContent.replace(/{{CHAIN_ID}}/g, selectedChainId);
            // Template-specific injections
            if (templateType === "donation") {
                routeContent = routeContent.replace(/{{TREASURY_WALLET}}/g, targetWallet);
            }
            else if (templateType === "nft-mint") {
                routeContent = routeContent.replace(/{{CANDY_MACHINE_ID}}/g, candyMachineId);
            }
            await fs.writeFile(routePath, routeContent);
        }
        consola.success(`Project initialized successfully! 🎉`);
        consola.info(`\nNext steps:\n  cd ${projectName}\n  npm install\n  npm run dev\n`);
    }
    catch (err) {
        consola.error("Project Initialization Failed!", err);
    }
});
program.parse(process.argv);
