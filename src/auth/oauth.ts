import {
  PublicClientApplication,
  type AuthenticationResult,
  type Configuration,
  CryptoProvider,
} from "@azure/msal-node";
import http from "node:http";
import open from "open";

const SCOPES = ["Tasks.Read", "Tasks.Read.Shared", "Group.Read.All", "User.Read"];

export interface OAuthConfig {
  clientId: string;
  tenantId: string;
  redirectPort: number;
  redirectUri: string;
}

export function loadOAuthConfig(): OAuthConfig {
  const clientId = process.env.AZURE_CLIENT_ID;
  const tenantId = process.env.AZURE_TENANT_ID ?? "common";
  const redirectPort = parseInt(process.env.REDIRECT_PORT ?? "3847", 10);
  const redirectUri = process.env.REDIRECT_URI ?? `http://localhost:${redirectPort}/auth/callback`;

  if (!clientId) {
    throw new Error("AZURE_CLIENT_ID is required. See .env.example");
  }

  return { clientId, tenantId, redirectPort, redirectUri };
}

export async function authenticate(config: OAuthConfig): Promise<AuthenticationResult> {
  const msalConfig: Configuration = {
    auth: {
      clientId: config.clientId,
      authority: `https://login.microsoftonline.com/${config.tenantId}`,
    },
  };

  const pca = new PublicClientApplication(msalConfig);
  const crypto = new CryptoProvider();
  const { verifier, challenge } = await crypto.generatePkceCodes();

  const authCodeUrl = await pca.getAuthCodeUrl({
    scopes: SCOPES,
    redirectUri: config.redirectUri,
    codeChallenge: challenge,
    codeChallengeMethod: "S256",
  });

  const code = await listenForAuthCode(config.redirectPort);

  const result = await pca.acquireTokenByCode({
    code,
    scopes: SCOPES,
    redirectUri: config.redirectUri,
    codeVerifier: verifier,
  });

  if (!result) {
    throw new Error("Authentication failed — no token received.");
  }

  // Open browser for user login
  await open(authCodeUrl);

  return result;
}

function listenForAuthCode(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost:${port}`);

      if (url.pathname !== "/auth/callback") {
        res.writeHead(404);
        res.end();
        return;
      }

      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(`<h2>Authentication failed</h2><p>${url.searchParams.get("error_description") ?? error}</p>`);
        server.close();
        reject(new Error(`OAuth error: ${error}`));
        return;
      }

      if (!code) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end("<h2>Missing authorization code</h2>");
        server.close();
        reject(new Error("No authorization code in callback"));
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<h2>Authenticated!</h2><p>You can close this tab and return to your LLM client.</p>");
      server.close();
      resolve(code);
    });

    server.listen(port, () => {
      console.error(`[context-weaver] Waiting for OAuth callback on port ${port}...`);
    });

    // Timeout after 2 minutes
    setTimeout(() => {
      server.close();
      reject(new Error("OAuth callback timed out after 120s"));
    }, 120_000);
  });
}
