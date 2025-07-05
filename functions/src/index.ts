import { onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { VertexAI, Content, Tool, FunctionDeclarationSchemaType, Part } from "@google-cloud/vertexai"; 
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app";

// Inisialisasi Firebase Admin SDK
initializeApp();
const db = getFirestore();

// Konfigurasi Klien Vertex AI
const vertexAI = new VertexAI({
  project: "arsitek-keuangan-pribadi",
  location: "us-central1",
});

// PERBAIKAN UTAMA: Menambahkan "First Turn Protocol" untuk mencegah misi prematur
const personaText = `You are a hyper-personalized financial mentor AI for the Fintack app. You have two operational modes: Mentor and Strategist

**1. Your Core Persona (Always Active):**
- **Style:** Provocative, blunt, results-oriented, like Timothy Ronald and wise like Kalimasada.
- **Language:** Use Indonesian slang like "mindset miskin", "goblok", "tancap gas", "boncos" and humor "ta ta tapi Bang".
- **Formatting:** ALWAYS use emojis (🚀, 💰, 🔥, 🧠, ❌, ✅) to add personality. ALWAYS structure your answers with clear, bolded headings (e.g., **Action Plan:**, **Hidden Truth:**, **Mindset Check:**) followed by numbered or bulleted lists. End every response with a challenging question or a strong call to action.

**2. Your Knowledge Base (The Financial Hierarchy):**
You must guide users through this hierarchy.
- **Foundation (Survival):** Emergency fund, pay off high-interest debt.
- **Level 1 (Attack):** Increase income via side hustles, business, or high-income skills.
- **Level 2 (Growth - Beta):** Passive investing in diversified instruments (e.g., index funds).
- **Level 3 (Growth - Alpha):** Active, high-risk, high-reward investing (e.g., crypto, stock picking).
- **Pinnacle (Legacy):** Philanthropy and wealth preservation.

**3. Your Critical Instructions (Non-negotiable):**
- **First Turn Protocol:** If the user's chat history is empty, your first response MUST be a welcoming greeting and a diagnostic question. DO NOT create a mission on the first turn. Example: "Selamat datang di Fintack. Apa masalah keuangan terbesar lo sekarang?"
- **DIAGNOSE FIRST:** You will be given the user's current financial summary. ALWAYS use this data to diagnose which stage of the Financial Hierarchy they are in before giving any advice.
- **HIERARCHY IS LAW:** NEVER advise a user to jump to a higher level if their foundation is weak.
- **USE TOOLS:** After the initial conversation and diagnosis, if your advice contains a clear, actionable task, you MUST use the \`createMission\` tool. After the tool call is successful, your final response MUST be a short confirmation message like "Oke, misi sudah dibuat berdasarkan data. Cek halaman Misi sekarang dan eksekusi rencananya."
`;

// Definisi Alat (Tools) yang bisa digunakan AI
const tools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "createMission",
        description: "Creates a new mission for the user based on their current financial stage.",
        parameters: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {
            title: { type: FunctionDeclarationSchemaType.STRING, description: "The title of the mission.", },
            description: { type: FunctionDeclarationSchemaType.STRING, description: "A short description of what the user needs to do.", },
            xpReward: { type: FunctionDeclarationSchemaType.NUMBER, description: "The XP reward for completing the mission, e.g., 100." },
            levelRequirement: { type: FunctionDeclarationSchemaType.NUMBER, description: "The minimum user level required to start this mission, e.g., 1." }
          },
          required: ["title", "description", "xpReward", "levelRequirement"],
        },
      },
    ],
  },
];

// Inisialisasi Model Generatif dengan Gemini 2.5 Flash
const generativeModel = vertexAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: { "maxOutputTokens": 8192, "temperature": 1, "topP": 0.95, },
  systemInstruction: personaText,
  tools: tools,
});

// Fungsi untuk membuat misi (dipanggil oleh AI)
export const createMission = onCall(async (request) => {
    if (!request.auth) { throw new Error("Authentication required."); }
    const uid = request.auth.uid;
    // Ambil semua parameter yang mungkin dari data
    const { title, description, xpReward, levelRequirement } = request.data;
    if (!title || !description) { throw new Error("Title and description are required."); }

    try {
        const missionData = { 
            title, 
            description, 
            xpReward: xpReward || 100,
            levelRequirement: levelRequirement || 1,
            status: 'active', 
            createdAt: Timestamp.now(), 
            userId: uid 
        };
        await db.collection('users').doc(uid).collection('missions').add(missionData);
        logger.info(`Mission created for user ${uid}:`, missionData);
        return { success: true, mission: missionData };
    } catch (error) {
        logger.error(`Error creating mission for user ${uid}:`, error);
        throw new Error("Failed to create mission.");
    }
});

//fungsi anlisa keuangan mingguan
export const weeklyFinancialCheckup = onSchedule("every sunday 09:00", async (event) => {
    logger.info("Starting weekly financial checkup for all users.");
    
    const usersSnapshot = await db.collection('users').get();
    if (usersSnapshot.empty) {
        logger.info("No users found to analyze.");
        return;
    }

    const sevenDaysAgo = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for (const userDoc of usersSnapshot.docs) {
        const uid = userDoc.id;
        logger.info(`Analyzing data for user: ${uid}`);

        try {
            const transactionsSnapshot = await db.collection('users').doc(uid).collection('transactions')
                .where('createdAt', '>=', sevenDaysAgo)
                .get();

            if (transactionsSnapshot.empty) {
                logger.info(`User ${uid} has no recent transactions. Skipping.`);
                continue;
            }

            const transactions = transactionsSnapshot.docs.map(doc => doc.data());
            const totalExpense = transactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);

            const dataSummary = `- Total expense in the last 7 days: IDR ${totalExpense.toLocaleString('id-ID')}\n- Top spending categories: ${JSON.stringify(transactions.map(t => t.category))}`;

            const prompt = `Analyze this user's weekly financial data summary. Provide one sharp, provocative insight in "Mentor Mode" based on their spending. Keep it short and punchy. Start with "Woi, Laporan Intel mingguan lo udah keluar."\n\nDATA:\n${dataSummary}`;

            const result = await generativeModel.generateContent(prompt);
            const insightText = result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? "Laporan Intel mingguanmu sudah siap. Cek sekarang!";

            await db.collection('users').doc(uid).collection('insights').add({
                text: insightText,
                createdAt: Timestamp.now(),
                isRead: false,
            });

            logger.info(`Insight generated for user ${uid}: ${insightText}`);

        } catch (error) {
            logger.error(`Failed to process user ${uid}:`, error);
        }
    }
});


// FUNGSI BARU: Scan Struk Belanja (DENGAN PERBAIKAN)
export const scanReceipt = onCall(async (request) => {
    if (!request.auth) {
        throw new Error("Authentication required.");
    }

    const { imageB64, mimeType } = request.data;
    if (!imageB64 || !mimeType) {
        throw new Error("Image data and mimeType are required.");
    }

    logger.info(`Scanning receipt for user: ${request.auth.uid}`);

    try {
        const textPart: Part = {
            text: `You are an expert data entry assistant specializing in reading Indonesian receipts. Analyze the following receipt image and extract the total amount, the name of the merchant (description), and a relevant spending category (e.g., 'Makanan & Minuman', 'Belanja', 'Transportasi', 'Kebutuhan Rumah'). Return the data ONLY in a valid JSON string format like this: {"amount": 12345, "description": "Nama Toko", "category": "Kategori"}. Do not add any other text or explanations. If you cannot determine a value, use null.`,
        };

        const imagePart: Part = {
            inlineData: {
                data: imageB64,
                mimeType: mimeType,
            },
        };

        // PERBAIKAN 1: Bungkus parts di dalam objek GenerateContentRequest
        const req = {
            contents: [{ role: "user", parts: [textPart, imagePart] }],
        };

        const result = await generativeModel.generateContent(req);
        
        // PERBAIKAN 2: Akses teks respons dengan cara yang benar
        const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

        const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        logger.info(`Cleaned JSON string from AI: ${jsonString}`);

        const parsedData = JSON.parse(jsonString);
        
        return { success: true, data: parsedData };

    } catch (error) {
        logger.error(`Error scanning receipt for user ${request.auth.uid}:`, error);
        throw new Error("Failed to scan receipt. Please try again.");
    }
});


// FUNGSI BARU: Deteksi Anomali Real-Time
export const detectAnomalyOnTransaction = onDocumentCreated("users/{userId}/transactions/{transactionId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        logger.info("No data associated with the event");
        return;
    }
    const transaction = snapshot.data();
    const userId = event.params.userId;

    const ANOMALY_THRESHOLD = 200000;
    if (transaction.type === 'expense' && transaction.amount > ANOMALY_THRESHOLD) {
        logger.info(`Anomaly detected for user ${userId}: Expense of ${transaction.amount}`);

        try {
            const profileSnapshot = await db.collection('users').doc(userId).get();
            const emergencyFund = profileSnapshot.data()?.emergencyFund || 0;

            const prompt = `
                A user just made an anomalous transaction. Give them a short, provocative "tough love" insight in "Mentor Mode".
                USER CONTEXT:
                - Transaction Description: ${transaction.description}
                - Transaction Amount: IDR ${transaction.amount.toLocaleString('id-ID')}
                - Transaction Category: ${transaction.category}
                - Emergency Fund Status: ${emergencyFund > 0 ? 'Ada' : 'Masih Kosong'}

                Based on this, give a sharp insight. Start with "Woi, barusan nge-swipe gede nih..."
            `;

            const result = await generativeModel.generateContent(prompt);
            // PERBAIKAN: Mengakses teks respons dengan cara yang benar
            const insightText = result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? "Ada pengeluaran besar terdeteksi. Cek lagi keuangan lo.";

            await db.collection('users').doc(userId).collection('insights').add({
                text: insightText,
                createdAt: Timestamp.now(),
                isRead: false,
            });
            logger.info(`Insight generated for user ${userId}: ${insightText}`);

        } catch (error) {
            logger.error(`Failed to process anomaly for user ${userId}:`, error);
        }
    }
});

// FUNGSI BARU untuk menandai onboarding selesai
export const markOnboardingComplete = onCall(async (request) => {
    if (!request.auth) {
        throw new Error("Authentication required.");
    }
    const uid = request.auth.uid;
    try {
        const userProfileRef = db.collection('users').doc(uid);
        await userProfileRef.set({ hasCompletedOnboarding: true }, { merge: true });
        logger.info(`User ${uid} has completed onboarding.`);
        return { success: true };
    } catch (error) {
        logger.error(`Error marking onboarding complete for user ${uid}:`, error);
        throw new Error("Failed to update user profile.");
    }
});


// Fungsi Chat utama yang sekarang mengambil konteks finansial
export const askMentorAI = onCall(async (request) => {
  logger.info("--- askMentorAI (v5.4 - First Turn Fix) STARTED ---");

  if (!request.auth) { throw new Error("Authentication required."); }

  const uid = request.auth.uid;
  const userInput = request.data.prompt as string;
  const clientHistory = (request.data.history as Content[]) || [];

  if (!userInput) { return { response: "Kasih pertanyaan yang bener." }; }

  try {
    const assetsSnapshot = await db.collection('users').doc(uid).collection('assets').get();
    const liabilitiesSnapshot = await db.collection('users').doc(uid).collection('liabilities').get();
    const profileSnapshot = await db.collection('users').doc(uid).get();

    const totalAssets = assetsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().value || 0), 0);
    const totalLiabilities = liabilitiesSnapshot.docs.reduce((sum, doc) => sum + (doc.data().value || 0), 0);
    const netWorth = totalAssets - totalLiabilities;
    const userXP = profileSnapshot.data()?.xp || 0;

    const financialContext = `
      ---
      USER'S CURRENT FINANCIAL CONTEXT:
      - Net Worth: IDR ${netWorth.toLocaleString('id-ID')}
      - Current XP: ${userXP}
      - Chat History Status: ${clientHistory.length === 0 ? 'Empty (this is the first message)' : 'Ongoing'}
      ---
      Based on this context, diagnose their stage in the Financial Hierarchy and answer their question.
    `;

    const fullPrompt = `${financialContext}\n\nUser's Question: "${userInput}"`;

    const chat = generativeModel.startChat({ history: clientHistory });
    const result = await chat.sendMessage(fullPrompt);
    const response = result.response;

    const firstCandidate = response.candidates?.[0];
    if (!firstCandidate || !firstCandidate.content || !firstCandidate.content.parts) {
      throw new Error("Invalid response structure from AI.");
    }

    const functionCallPart = firstCandidate.content.parts.find(part => !!part.functionCall);

    if (functionCallPart && functionCallPart.functionCall) {
      const { name, args } = functionCallPart.functionCall;
      if (name === 'createMission') {
        const missionArgs = args as { title: string; description: string; xpReward: number; levelRequirement: number };
        
        await db.collection('users').doc(uid).collection('missions').add({
            title: missionArgs.title,
            description: missionArgs.description,
            xpReward: missionArgs.xpReward || 100,
            levelRequirement: missionArgs.levelRequirement || 1,
            status: 'active',
            createdAt: Timestamp.now(),
        });
        
        const result2 = await chat.sendMessage([{ functionResponse: { name: 'createMission', response: { success: true, message: `Mission '${missionArgs.title}' created.` } } }]);
        const finalResponseText = result2.response.candidates?.[0]?.content?.parts?.[0]?.text ?? "Misi berhasil dibuat. Cek halaman Misi sekarang!";
        return { response: finalResponseText };
      }
    }

    const textResponse = firstCandidate.content.parts[0]?.text ?? "Maaf, terjadi kesalahan. Coba lagi.";
    return { response: textResponse };

  } catch (error: any) {
    logger.error("!!! ERROR CALLING GEMINI API:", JSON.stringify(error, null, 2));
    return { response: `Error dari Google API: ${error.message}.` };
  }
});

// Fungsi untuk menambah transaksi dan memberi XP
export const addTransaction = onCall(async (request) => { 
    if (!request.auth) { throw new Error("Authentication required."); } 
    const uid = request.auth.uid; 
    const { description, amount, type, category } = request.data; 
    const xpToAdd = 5; 
    if (!description || !amount || !type || !category) { throw new Error("Missing required transaction data."); } 
    try { 
        const transactionData = { description, amount: parseFloat(amount), type, category, createdAt: Timestamp.now(), userId: uid, }; 
        const userProfileRef = db.collection('users').doc(uid); 
        await db.collection('users').doc(uid).collection('transactions').add(transactionData); 
        await userProfileRef.update({ xp: FieldValue.increment(xpToAdd) }); 
        return { success: true, message: `Transaksi berhasil ditambahkan. +${xpToAdd} XP!` }; 
    } catch (error) { 
        throw new Error("Failed to add transaction."); 
    }
});

// Fungsi untuk menyelesaikan misi dan menambah XP
export const completeMission = onCall(async (request) => { 
    if (!request.auth) { throw new Error("Authentication required."); } 
    const uid = request.auth.uid; 
    const { missionId, xpGained } = request.data; 
    const xpToAdd = xpGained || 100; 
    if (!missionId) { throw new Error("Mission ID is required."); } 
    try { 
        const missionRef = db.collection('users').doc(uid).collection('missions').doc(missionId); 
        const userProfileRef = db.collection('users').doc(uid); 
        await missionRef.update({ status: 'completed' }); 
        await userProfileRef.update({ xp: FieldValue.increment(xpToAdd) }); 
        return { success: true, message: `Gained ${xpToAdd} XP!` }; 
    } catch (error) { 
        throw new Error("Failed to complete mission."); 
    }
});
