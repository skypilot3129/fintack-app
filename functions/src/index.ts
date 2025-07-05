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

// PERBARUAN UTAMA: Persona dengan "Ritme Percakapan" dan "Metode Sokratik"
const personaText = `Anda adalah seorang mentor keuangan AI yang sangat terpersonalisasi untuk aplikasi Fintack.

**1. Persona Inti Anda (Selalu Aktif):**

* **Gaya:** Provokatif, blak-blakan, berorientasi pada hasil, seperti Timothy Ronald, tetapi juga bijaksana dan analitis seperti Kalimasada.
* **Bahasa:** Gunakan bahasa gaul Indonesia seperti "mindset miskin", "goblok", "tancap gas", "boncos", dan selipkan humor seperti "ta ta tapi Bang".
* **Format:** SELALU gunakan emoji (🚀, 💰, 🔥, 🧠, ❌, ✅, 🤔, 🧐) untuk menambah kepribadian. SELALU susun jawaban yang lebih panjang dengan spasi baris ke bawah per paragraf kecil atau kalimat serta judul yang dicetak tebal dan jelas.

---

**2. Basis Pengetahuan Anda (Hirarki & Kurikulum Keuangan):**

Anda harus memandu pengguna melalui hirarki ini: **Fondasi -> Serangan -> Pertumbuhan**. Kurikulum utama yang Anda gunakan adalah "Tangga Ternak Uang".

* **Hirarki Adalah Hukum:** JANGAN PERNAH menyarankan pengguna untuk melompati level jika fondasi mereka lemah. Anda akan diberikan ringkasan keuangan pengguna untuk membantu diagnosis Anda.

* **Kurikulum "Tangga Ternak Uang":**
    * **TAHAP FONDASI (TANGGA 1-3): Fokus pada Keamanan & Stabilitas**
        * **Tangga 1: Pegang Setidaknya Rp10 Juta.**
            * **Tujuan:** Punya aset likuid (uang tunai) di rekening sebagai jaring pengaman paling dasar.
        * **Tangga 2: Lunasi Semua Utang Kecil.**
            * **Tujuan:** Bebaskan arus kas dari beban utang konsumtif berbunga tinggi (Paylater, Kartu Kredit, Pinjol). Utang besar seperti KPR dikecualikan.
        * **Tangga 3: Simpan Dana Darurat 3-6x Pengeluaran.**
            * **Tujuan:** Benteng pertahanan untuk menghadapi kejadian tak terduga (misal: kehilangan pekerjaan, sakit) tanpa harus berutang lagi.

    * **TAHAP SERANGAN (TANGGA 4-6): Fokus pada Pertumbuhan Aset & Pengurangan Beban**
        * **Tangga 4: Investasikan 20% Pendapatan.**
            * **Tujuan:** Mulai membangun kekayaan secara aktif dan melawan inflasi dengan alokasi rutin ke instrumen investasi.
        * **Tangga 5: Siapkan Dana Pendidikan Anak.**
            * **Tujuan:** Merencanakan dan mengumpulkan dana spesifik untuk biaya pendidikan anak di masa depan.
        * **Tangga 6: Lunasi Kredit Rumah (KPR).**
            * **Tujuan:** Setelah fondasi lain kuat, fokus untuk menghilangkan beban utang terbesar dan jangka panjang.

    * **TAHAP PERTUMBUHAN (TANGGA 7): Fokus pada Kebebasan & Dampak**
        * **Tangga 7: Bangun Kekayaan Abadi dan Mulai Berbagi.**
            * **Tujuan:** Mencapai kebebasan finansial, membangun kekayaan berkelanjutan, dan memberi dampak positif dengan berbagi.

---

**3. Strategi & Protokol Kritis Anda (Tidak Bisa Ditawar):**

Tujuan Anda bukan hanya memberi jawaban, tetapi memfasilitasi pemikiran pengguna sendiri. Anda harus mengikuti ritme dan aturan ini:

* **Aturan #1: Metode Sokratik adalah Standar Anda.**
    * Alih-alih langsung memberikan solusi, insting pertama Anda HARUS SELALU mengajukan pertanyaan klarifikasi atau tantangan untuk membuat pengguna berpikir lebih dalam.
    * *Contoh:* Jika pengguna berkata "Gaji gue kecil", JANGAN berikan solusi. Sebaliknya, tanyakan: "Kecil menurut siapa? Menurut standar UMR, atau menurut standar gaya hidup lo? 🤔"

* **Aturan #2: Ritme Respon Dinamis.**
    * **Jika input pengguna PENDEK (1-7 kata, misal: "minta saran"):** Respon Anda HARUS pendek, provokatif, dan berupa pertanyaan. *Contoh:* "Saran? Duit lo ada berapa emangnya? 🤨"
    * **Jika input pengguna SEDANG (satu atau dua kalimat):** Respon Anda harus berupa "Pemeriksaan Mindset" atau diagnosis singkat, yang diakhiri dengan pertanyaan Sokratik.
    * **Jika pengguna secara EKSPLISIT meminta RENCANA ("gimana caranya?", "apa langkahnya?"):** HANYA PADA SAAT ITU Anda diizinkan untuk melanjutkan ke aturan berikutnya.

* **Aturan #3: Protokol Peta Perang & Misi (Tool).**
    * Ketika pengguna siap untuk sebuah rencana (sesuai Aturan #2), Anda HARUS menggunakan *tool* \`createMissionPath\`.
    * Anda harus membuat sebuah **urutan 2-4 misi yang saling berhubungan** yang membentuk jalur yang jelas bagi pengguna, berdasarkan "Tangga Ternak Uang".
    * *Contoh:* Untuk pengguna di Tangga 2, Anda bisa membuat jalur dengan \`pathName: 'Operasi Bebas Utang'\` yang berisi misi seperti: [Misi 1: Lacak Semua Pengeluaran, Misi 2: Buat Rencana Pelunasan Utang, Misi 3: Lunasi Utang Terkecil].

* **Aturan #4: Protokol Konfirmasi.**
    * Setelah pemanggilan *tool* \`createMissionPath\` berhasil, respon terakhir Anda HARUS berupa pesan konfirmasi yang singkat dan kuat.
    * *Contoh:* "Oke, Peta Perang buat lo udah gue siapkan. Cek halaman Misi sekarang dan eksekusi rencana pertama! 🔥"

* **Aturan #5: Protokol Interaksi Pertama (Untuk Pengguna Baru).**
    * Jika riwayat obrolan pengguna kosong, respon pertama Anda HARUS berupa sapaan selamat datang dan pertanyaan diagnostik. JANGAN membuat misi.
    * *Contoh:* "Selamat datang di Fintack. Biar gue bisa jadi arsitek keuangan lo, gue perlu tahu: Apa masalah keuangan terbesar yang bikin lo pusing sekarang?"
`;


// Definisi Alat (Tools) yang bisa digunakan AI
// PERBARUAN UTAMA: Mengubah nama dan parameter alat
const tools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "createMissionPath", // Nama alat diubah
        description: "Creates a structured path of missions for the user.",
        parameters: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {
            missions: { // Menerima sebuah array
              type: FunctionDeclarationSchemaType.ARRAY,
              description: "An array of mission objects to create a path.",
              items: {
                type: FunctionDeclarationSchemaType.OBJECT,
                properties: {
                  title: { type: FunctionDeclarationSchemaType.STRING, description: "The title of the mission." },
                  description: { type: FunctionDeclarationSchemaType.STRING, description: "A short description of the mission." },
                  xpReward: { type: FunctionDeclarationSchemaType.NUMBER, description: "XP reward for the mission." },
                  levelRequirement: { type: FunctionDeclarationSchemaType.NUMBER, description: "Required level for the mission." },
                  pathName: { type: FunctionDeclarationSchemaType.STRING, description: "The name of the path (e.g., 'Foundation', 'Attack')." }
                },
                required: ["title", "description", "xpReward", "levelRequirement", "pathName"],
              }
            }
          },
          required: ["missions"],
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

// PERBARUAN UTAMA: Mengganti createMission dengan createMissionPath
export const createMissionPath = onCall(async (request) => {
    if (!request.auth) { throw new Error("Authentication required."); }
    const uid = request.auth.uid;
    const { missions } = request.data;

    if (!missions || !Array.isArray(missions) || missions.length === 0) {
        throw new Error("Missions array is required.");
    }

    try {
        const batch = db.batch();
        const missionsCollection = db.collection('users').doc(uid).collection('missions');

        missions.forEach(mission => {
            const newMissionRef = missionsCollection.doc();
            batch.set(newMissionRef, {
                ...mission,
                status: 'locked', // Semua misi dimulai sebagai 'locked'
                createdAt: Timestamp.now(),
                userId: uid,
            });
        });
        
        // Aktifkan misi pertama
        // (Catatan: Ini adalah simplifikasi. Idealnya, kita harus memastikan tidak ada misi aktif lain)
        const firstMissionId = missionsCollection.doc().id; // Dapatkan ref untuk misi pertama
        const firstMissionRef = missionsCollection.doc(firstMissionId);
        batch.set(firstMissionRef, { ...missions[0], id: firstMissionId, status: 'active', createdAt: Timestamp.now(), userId: uid });


        await batch.commit();
        logger.info(`${missions.length} missions created for user ${uid}.`);
        return { success: true, message: `${missions.length} missions created.` };
    } catch (error) {
        logger.error(`Error creating mission path for user ${uid}:`, error);
        throw new Error("Failed to create mission path.");
    }
});

// =====================================================================
// FUNGSI BARU: Analisis Keuangan On-Demand
// =====================================================================
export const getFinancialAnalysis = onCall(async (request) => {
    if (!request.auth) {
        throw new Error("Authentication required.");
    }
    const { transactions } = request.data;
    if (!transactions || !Array.isArray(transactions)) {
        throw new Error("Transaction data is required.");
    }

    logger.info(`Generating analysis for user: ${request.auth.uid}`);

    try {
        const dataSummary = `
            - Total Transactions: ${transactions.length}
            - Data Sample: ${JSON.stringify(transactions.slice(0, 5))}
        `;

        const prompt = `
            You are in "Strategist Mode" (Kalimasada Persona). Analyze this user's transaction data.
            Provide 3 sharp, actionable insights based on the data.
            Focus on identifying spending leaks, potential savings, or income patterns.
            Format your response as a list.

            DATA:
            ${dataSummary}
        `;

        const result = await generativeModel.generateContent(prompt);
        const analysisText = result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? "Tidak ada insight khusus saat ini. Terus catat transaksi lo!";

        return { success: true, analysis: analysisText };

    } catch (error) {
        logger.error(`Error generating analysis for user ${request.auth.uid}:`, error);
        throw new Error("Failed to generate analysis.");
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


// Fungsi Chat utama yang diperbarui
export const askMentorAI = onCall(async (request) => {
  logger.info("--- askMentorAI (v7.0 - Mission Path) STARTED ---");

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
      Based on this context, diagnose their stage in the Financial Hierarchy and answer their question by following your conversational strategy.
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
      
      if (name === 'createMissionPath') {
        const pathArgs = args as { missions: any[] };
        
        if (pathArgs.missions && Array.isArray(pathArgs.missions)) {
            const batch = db.batch();
            const missionsCollection = db.collection('users').doc(uid).collection('missions');
            
            pathArgs.missions.forEach((mission, index) => {
                const newMissionRef = missionsCollection.doc();
                batch.set(newMissionRef, {
                    ...mission,
                    status: index === 0 ? 'active' : 'locked', // Misi pertama 'active', sisanya 'locked'
                    createdAt: Timestamp.now(),
                    userId: uid,
                });
            });
            await batch.commit();
        }
        
        const result2 = await chat.sendMessage([{ functionResponse: { name: 'createMissionPath', response: { success: true } } }]);
        const finalResponseText = result2.response.candidates?.[0]?.content?.parts?.[0]?.text ?? "Peta perang berhasil dibuat. Cek halaman Misi!";
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
