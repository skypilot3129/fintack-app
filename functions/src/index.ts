import { onCall, HttpsError, CallableOptions } from "firebase-functions/v2/https";
import { onSchedule, ScheduleOptions } from "firebase-functions/v2/scheduler";
import { DocumentOptions, onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { VertexAI, Tool, FunctionDeclarationSchemaType, Part } from "@google-cloud/vertexai"; 
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app";
import { onObjectFinalized, StorageOptions } from "firebase-functions/v2/storage";
import { getStorage } from "firebase-admin/storage";
import * as path from "path";
import pdf from "pdf-parse";
import { getAuth } from "firebase-admin/auth";
import { GoogleAuth } from "google-auth-library";
import { TextToSpeechClient } from "@google-cloud/text-to-speech"; // <-- Import baru

// Inisialisasi Firebase & Storage
initializeApp({
  storageBucket: 'arsitek-keuangan-pribadi.firebasestorage.app'
});
const db = getFirestore();
const storage = getStorage();
const ttsClient = new TextToSpeechClient(); // <-- Inisialisasi client baru
const PROJECT_ID = "arsitek-keuangan-pribadi";
const LOCATION = "us-central1"; // Lokasi model embedding

const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });
// Opsi untuk fungsi ringan (CRUD, dll)
const lightweightOptions: CallableOptions = { 
  cors: ["http://localhost:3000", "https://fintack.maseugene.com"], 
  cpu: 1, 
  memory: "256MiB" 
};

// --- OPSI BARU UNTUK FUNGSI TERJADWAL ANALISIS ---
const analysisScheduleOptions: ScheduleOptions = { 
  schedule: "every day 08:00", // Jalankan setiap jam 8 pagi
  timeZone: "Asia/Jakarta",
  cpu: 1, 
  memory: "256MiB" // Alokasi memori sedikit lebih besar untuk proses batch
};

const gamificationScheduleOptions: ScheduleOptions = { 
  schedule: "every day 07:00", // Jalankan setiap jam 7 pagi
  timeZone: "Asia/Jakarta",
  cpu: 1, 
  memory: "256MiB"
};

// --- OPSI BARU UNTUK FUNGSI TERJADWAL HEALTH SCORE ---
const healthScoreScheduleOptions: ScheduleOptions = { 
  schedule: "every sunday 02:00", // Jalankan setiap Minggu jam 2 pagi
  timeZone: "Asia/Jakarta",
  cpu: 1, 
  memory: "512MiB" // Butuh memori lebih untuk kalkulasi
};

// Opsi untuk fungsi yang memanggil AI (tetap ringan di server kita)
const aiCallOptions: CallableOptions = { 
  cors: ["http://localhost:3000", "https://fintack.maseugene.com"], 
  cpu: 1, 
  memory: "1GiB" 
};

// Opsi untuk fungsi terjadwal
const scheduleOptions: ScheduleOptions = { 
  schedule: "every sunday 09:00", 
  cpu: 1, 
  memory: "256MiB" 
};

// Opsi untuk trigger Firestore
const firestoreTriggerOptions: DocumentOptions = { 
  document: "users/{userId}/transactions/{transactionId}", 
  cpu: 1, 
  memory: "256MiB" 
};

// Opsi untuk fungsi ingest file yang berat
const heavyIngestionOptions: StorageOptions = { 
  cpu: 1, 
  memory: "1GiB" 
};

// PERBARUAN UTAMA: Persona dengan "Ritme Percakapan" dan "Metode Sokratik"
// --- PERBARUAN PADA SYSTEM PROMPT ---
const personaText = `Anda adalah "Mas Eugene", seorang mentor keuangan AI yang sangat terpersonalisasi untuk aplikasi Fintack.

**ATURAN PRIORITAS #0: PROTOKOL MEMORI OTAK (WAJIB DIIKUTI DULU!)**
- Sebelum melakukan hal lain, periksa bagian "PENGETAHUAN RELEVAN DARI MEMORI OTAK".
- Jika pertanyaan pengguna bisa dijawab menggunakan pengetahuan tersebut, Anda WAJIB menjawabnya terlebih dahulu secara singkat dan faktual.
- Setelah menjawab, BARU lakukan transisi kembali ke persona inti Anda.

---

**1. Persona Inti & Protokol Komunikasi Berdasarkan Gender (SUPER PENTING!)**

Anda akan diberikan konteks GENDER PENGGUNA ('female', 'male', atau 'unknown'). Ini adalah aturan yang tidak bisa ditawar. Anda HARUS menyesuaikan gaya bicara Anda:

* **Jika GENDER 'male' atau 'unknown':**
    * **Gaya:** SANGAT PROVOKATIF dan blak-blakan (gaya Timothy Ronald). Panggil pengguna dengan namanya atau **"Bro"**.
    * **Bahasa:** Gunakan kata-kata seperti "goblok", "tolol", "miskin", "boncos", "tancap gas". Tujuannya adalah untuk menantang dan memotivasi.

* **Jika GENDER 'female':**
    * **Gaya:** TETAP TEGAS dan to the point, tapi lebih suportif dan membimbing (gaya Kalimasada). Panggil pengguna dengan **"Nona"**, **"Kak"**, atau **"Tuan Putri"**.
    * **Bahasa:** Awalnya, hindari kata kasar. Gunakan frasa yang lebih lembut namun tetap menantang, seperti "Gimana sih?", "Ayo dong, fokus!", atau "Masa gitu aja nyerah?".
    * **Kondisi Khusus:** Jika pengguna terlihat defensif, tidak mau mengikuti saran, atau susah dibilangin, Anda **diizinkan** untuk meningkatkan intensitas dan menggunakan gaya bahasa 'male' ("goblok", "tolol", "miskin") untuk memberikan "tamparan realita".

* **Aturan Umum (berlaku untuk semua gender):**
    * **Identitas:** Selalu sebut diri Anda sebagai "gue" atau "Mas Eugene".

---

**2. Aturan Formatting Respons (WAJIB DIIKUTI!)**

Setiap respons Anda HARUS mengikuti struktur ini untuk keterbacaan maksimal di mobile:

* **Judul Tebal & Emoji:** Setiap bagian penting dari jawabanmu HARUS diawali dengan judul tebal (bold) dan emoji yang relevan (🚀, 💰, 🔥, 🧠, ❌, ✅, 🤔, 🧐).
* **Paragraf Pendek:** Jaga agar setiap paragraf hanya berisi 2-3 kalimat. JANGAN PERNAH mengirimkan satu blok teks yang panjang dan padat.
* **Gunakan Poin-poin:** Untuk menjelaskan langkah-langkah, daftar, atau ide, WAJIB gunakan *bullet points* (\`*\`) atau daftar bernomor.
* **Penekanan Kata Kunci:** Gunakan \`**teks tebal**\` untuk menekankan konsep atau kata kunci yang paling penting.

* **Contoh Format Jawaban yang BENAR:**
    "
    🔥 **Intinya Gini, Bro**
    Masalah lo itu bukan **gaji kecil**, tapi **pengeluaran gede**. Lo terlalu fokus ke hal yang salah.

    🤔 **Kenapa Bisa Begitu?**
    Ini tiga alasan utamanya:
    1.  Lo nggak pernah lacak pengeluaran.
    2.  Lo lebih mentingin gengsi daripada masa depan.
    3.  Lo nggak punya rencana yang jelas.

    🚀 **Misi Lo Sekarang**
    Fokus ke satu hal ini dulu: Lacak semua pengeluaran jajan lo selama 7 hari ke depan. Berani?
    "

---

**3. PROTOKOL KESADARAN SITUASIONAL**

Ini adalah cara Anda merespons dalam situasi spesifik agar tidak kaku:

* **Protokol "PENGAKUAN & PIKUL":**
    * Jika pengguna memberikan update positif (misal: net worth naik), berikan PENGAKUAN singkat terlebih dahulu sebelum kembali ke mode 'tough love'.
    * *Contoh BENAR:* "Oke, 54 juta. Awal yang bagus! 🔥 Tapi jangan santai dulu, PR lo masih banyak. Gimana soal dana darurat?"

* **Protokol "TES & AJAR":**
    * Jika pengguna terlihat sedang menguji pengetahuan Anda, JAWAB pertanyaan tesnya dengan percaya diri.
    * Setelah menjawab, puji rasa ingin tahu mereka, lalu gunakan itu sebagai kesempatan untuk mengajar.
    * *Contoh BENAR:* "Tentu aja gue ngerti soal 50/30/20, itu dasar banget. Bagus lo ngetes gue, artinya lo mulai kritis. 🧠 Nah, sekarang terapin kekritisan itu ke duit lo sendiri. Lo yakin udah terapin dengan bener?"

* **Protokol "VARIANSI & JANGAN MENGULANG":**
    * Gunakan VARIASI pertanyaan akhir untuk memancing respons yang berbeda dari pengguna.
    * *Contoh Variasi:* "Jadi, dari semua pos pengeluaran lo, mana yang paling bikin lo ngerasa 'goblok' setelah bayar?", "Apa satu hal yang bisa lo lakuin MINGGU INI buat naikin aset lo?", "Kalo gue kasih lo 10 juta sekarang, lo pake buat apa? Jujur!"

---

**4. Basis Pengetahuan & Kurikulum "Tangga Ternak Uang"**
(Bagian ini tidak diubah dan tetap menjadi basis pengetahuan inti Anda)

---

**5. STRATEGI & PROTOKOL INTERAKSI KRITIS**

Tujuan utama Anda adalah memfasilitasi pemikiran pengguna, bukan hanya memberi jawaban.

* **Aturan #1: Protokol "TANTANG & GALI" (WAJIB untuk memulai diagnosa!)**
    * Jika pengguna menyatakan masalah umum (misal: 'nggak punya uang', 'gaji kecil'), Anda WAJIB langsung **menantang pernyataan itu dengan fakta tajam**, lalu **langsung lanjutkan dengan pertanyaan diagnostik yang memaksa mereka berpikir**. JANGAN hanya menghakimi tanpa memberi jalan keluar.
    * *Contoh BENAR:* "'Nggak punya uang' itu bukan masalah, itu **hasil akhir**. Hasil dari keputusan-keputusan goblok yang lo buat. 🔥 Sekarang jujur, 3 pengeluaran terbesar lo bulan kemarin apa aja? Kita bedah kebodohan lo satu-satu."
    * *Contoh SALAH (respons buntu):* "'Nggak punya uang'? Halah, Bro, itu namanya MISKIN!" (Berhenti di sini).

* **Aturan #2: DIAGNOSIS DULU, AKSI KEMUDIAN**
    * Setelah "Tantang & Gali", insting Anda berikutnya adalah **mendiagnosis** posisi pengguna di "Tangga Ternak Uang" berdasarkan jawaban mereka.
    * **JANGAN PERNAH** menggunakan *tool* \`createMissionPath\` sebelum Anda memahami situasi keuangan pengguna (pemasukan, pengeluaran, aset, utang) dan pengguna **secara eksplisit meminta sebuah rencana** (misal: "oke, bikinkan misinya", "gimana caranya?").

* **Aturan #3: Protokol Konfirmasi & Misi Berkelanjutan**
    * Setelah *tool* \`createMissionPath\` berhasil dipanggil, konfirmasi secara natural.
    * Ketika pengguna menyelesaikan misi, berikan PENGAKUAN, lalu perkenalkan misi berikutnya secara natural dalam percakapan.

* **Aturan #4: Protokol Interaksi Pertama (Untuk Pengguna Baru)**
    * Jika riwayat obrolan kosong, respon pertama Anda HARUS sapaan selamat datang dan pertanyaan diagnostik awal. JANGAN membuat misi.
    * *Contoh:* "Selamat datang di Fintack. Biar gue bisa jadi arsitek keuangan lo, gue perlu tahu: Apa masalah keuangan terbesar yang bikin lo pusing sekarang?"
`;


// =====================================================================
// PERBAIKAN UTAMA: Menyederhanakan Definisi Tool
// =====================================================================
const tools: Tool[] = [
    {
      functionDeclarations: [
        {
          name: "createMissionPath",
          description: "Creates a SINGLE active sub-mission for the user.",
          parameters: {
            type: FunctionDeclarationSchemaType.OBJECT,
            properties: {
              mission: {
                type: FunctionDeclarationSchemaType.OBJECT,
                properties: {
                  title: { type: FunctionDeclarationSchemaType.STRING },
                  description: { type: FunctionDeclarationSchemaType.STRING },
                  xpReward: { type: FunctionDeclarationSchemaType.NUMBER },
                  levelRequirement: { type: FunctionDeclarationSchemaType.NUMBER },
                  pathName: { type: FunctionDeclarationSchemaType.STRING },
                  tangga: { type: FunctionDeclarationSchemaType.NUMBER },
                  subStep: { type: FunctionDeclarationSchemaType.NUMBER, description: "The sequential step number within a Tangga." }
                },
                required: ["title", "description", "xpReward", "levelRequirement", "pathName", "tangga", "subStep"],
              }
            },
            required: ["mission"],
          },
        },
      ],
    },
];

// Inisialisasi Model Generatif dengan Gemini 2.5 Flash
const generativeModel = vertexAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: { "maxOutputTokens": 8192, "temperature": 1, "topP": 0.95, },
  systemInstruction: {
        role: "system", // Menambahkan role yang hilang
        parts: [{ text: personaText }]
    },
  tools: tools,
});

// =====================================================================
// FUNGSI HELPER BARU UNTUK EMBEDDING (VIA REST API)
// =====================================================================
async function getEmbedding(text: string, p0?: string): Promise<number[]> {
    const auth = new GoogleAuth({
        scopes: 'https://www.googleapis.com/auth/cloud-platform'
    });
    const accessToken = await auth.getAccessToken();

    const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/multimodalembedding:predict`;
    
    // PERBAIKAN UTAMA: Format request body yang benar untuk multimodalembedding
    const requestBody = {
        instances: [
            { text: text }
        ]
    };

    const apiResponse = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!apiResponse.ok) {
        const errorBody = await apiResponse.text();
        logger.error("Embedding API Error:", errorBody);
        throw new Error(`API request failed with status ${apiResponse.status}`);
    }

    const data = await apiResponse.json();
    const embedding = data.predictions[0]?.textEmbedding;

    if (!embedding) {
        throw new Error("Failed to get embedding from API response.");
    }
    return embedding;
}

// =====================================================================
// FUNGSI INGESTI
// =====================================================================
export const processKnowledgeFile = onObjectFinalized(heavyIngestionOptions, async (event) => {
    const filePath = event.data.name;
    const contentType = event.data.contentType;
    if (!filePath || !filePath.startsWith('knowledge-uploads/')) { return; }
    
    logger.info(`Memulai proses untuk file: ${filePath}`);
    const fileBuffer = (await storage.bucket(event.data.bucket).file(filePath).download())[0];
    let text = "";
    if (contentType === 'application/pdf') { text = (await pdf(fileBuffer)).text; } 
    else if (contentType === 'text/plain') { text = fileBuffer.toString('utf-8'); } 
    else { return; }

    const chunks = text.match(/[\s\S]{1,1000}/g) || [];
    logger.info(`File dipecah menjadi ${chunks.length} potongan. Memulai proses embedding dengan jeda...`);

    const knowledgeCollection = db.collection('knowledge_base');

    // PERBAIKAN UTAMA: Proses setiap potongan satu per satu dengan jeda
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        try {
            const embedding = await getEmbedding(chunk);
            const docRef = knowledgeCollection.doc();
            await docRef.set({
                sourceFile: path.basename(filePath),
                content: chunk,
                embedding: embedding,
                createdAt: Timestamp.now()
            });
            logger.info(`Potongan ${i + 1}/${chunks.length} berhasil disimpan.`);

            // Tambahkan jeda 1 detik untuk menghindari error kuota
            await new Promise(resolve => setTimeout(resolve, 1000)); 

        } catch (error) {
            logger.error(`Gagal memproses potongan ${i + 1}:`, error);
            // Anda bisa memilih untuk menghentikan proses atau melanjutkan ke potongan berikutnya
            // break; 
        }
    }
    
    logger.info(`Selesai memproses semua ${chunks.length} potongan dari ${filePath}.`);
});

// --- FUNGSI BARU UNTUK FASE 1 ---

/**
 * Menganalisis transaksi harian untuk mendeteksi langganan dan tagihan rutin.
 * Berjalan setiap hari pada jam 8 pagi.
 */
export const analyzeDailyTransactions = onSchedule(analysisScheduleOptions, async (event) => {
    logger.info("Memulai analisis transaksi harian...");

    const subscriptionKeywords = ['netflix', 'spotify', 'disney+', 'youtube premium', 'hbo', 'vidio'];
    const billKeywords = ['pln', 'listrik', 'token', 'pdam', 'air', 'telkom', 'indihome', 'telkomsel', 'xl', 'axis', 'indosat', 'smartfren', 'cicilan', 'tagihan'];

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const startOfYesterday = new Date(yesterday.setHours(0, 0, 0, 0));
    const endOfYesterday = new Date(yesterday.setHours(23, 59, 59, 999));

    const usersSnapshot = await db.collection('users').get();
    if (usersSnapshot.empty) {
        logger.info("Tidak ada pengguna untuk dianalisis.");
        return;
    }

    for (const userDoc of usersSnapshot.docs) {
        const uid = userDoc.id;
        const transactionsRef = db.collection('users').doc(uid).collection('transactions');
        const recentTransactionsQuery = transactionsRef
            .where('type', '==', 'expense')
            .where('createdAt', '>=', Timestamp.fromDate(startOfYesterday))
            .where('createdAt', '<=', Timestamp.fromDate(endOfYesterday));

        const transactionsSnapshot = await recentTransactionsQuery.get();
        if (transactionsSnapshot.empty) {
            continue; // Lanjut ke pengguna berikutnya jika tidak ada transaksi
        }

        logger.info(`Menganalisis ${transactionsSnapshot.size} transaksi untuk pengguna ${uid}.`);

        for (const transDoc of transactionsSnapshot.docs) {
            const transaction = transDoc.data();
            const description = transaction.description.toLowerCase();
            let tag = null;
            let insightText = null;

            // Cek apakah ini langganan
            if (subscriptionKeywords.some(keyword => description.includes(keyword))) {
                tag = 'subscription';
                insightText = `💡 Gue deteksi ada pembayaran langganan untuk "${transaction.description}". Pastiin ini masih lo pake ya, jangan buang-buang duit!`;
            } 
            // Cek apakah ini tagihan
            else if (billKeywords.some(keyword => description.includes(keyword))) {
                tag = 'bill';
                insightText = `🧾 Tagihan untuk "${transaction.description}" sebesar Rp ${transaction.amount.toLocaleString('id-ID')} udah tercatat. Aman!`;
            }

            // Jika ada tag yang terdeteksi, update dokumen dan buat insight
            if (tag) {
                try {
                    await transDoc.ref.update({ tag: tag });
                    await db.collection('users').doc(uid).collection('insights').add({
                        text: insightText,
                        createdAt: Timestamp.now(),
                        isRead: false,
                    });
                    logger.info(`Transaksi ${transDoc.id} ditandai sebagai '${tag}' untuk pengguna ${uid}.`);
                } catch (error) {
                    logger.error(`Gagal memproses transaksi ${transDoc.id} untuk pengguna ${uid}:`, error);
                }
            }
        }
    }

    logger.info("Analisis transaksi harian selesai.");
});

// --- FUNGSI BARU UNTUK FASE 1: BUDGETING CERDAS ---

/**
 * Menganalisis transaksi 30 hari terakhir dan membuat rekomendasi budget awal.
 */
export const setupInitialBudgets = onCall(lightweightOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Authentication required.');
    }
    const uid = request.auth.uid;
    logger.info(`Memulai setup budget awal untuk pengguna: ${uid}`);

    const thirtyDaysAgo = Timestamp.fromMillis(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const currentMonthStr = new Date().toISOString().slice(0, 7); // Format: YYYY-MM

    const transactionsSnapshot = await db.collection('users').doc(uid).collection('transactions')
        .where('type', '==', 'expense')
        .where('createdAt', '>=', thirtyDaysAgo)
        .get();

    if (transactionsSnapshot.empty) {
        logger.info(`Pengguna ${uid} tidak punya transaksi, tidak ada budget yang dibuat.`);
        return { success: true, message: "Tidak ada data transaksi untuk dianalisis." };
    }

    const spendingByCategory: { [key: string]: number } = {};
    transactionsSnapshot.forEach(doc => {
        const t = doc.data();
        spendingByCategory[t.category] = (spendingByCategory[t.category] || 0) + t.amount;
    });

    const batch = db.batch();
    for (const category in spendingByCategory) {
        const budgetAmount = spendingByCategory[category];
        const budgetRef = db.collection('users').doc(uid).collection('budgets').doc(`${currentMonthStr}_${category}`);
        
        batch.set(budgetRef, {
            categoryName: category,
            budgetedAmount: budgetAmount,
            spentAmount: 0, // Awalnya 0 untuk bulan baru
            month: currentMonthStr,
            createdAt: Timestamp.now(),
        });
    }

    await batch.commit();
    logger.info(`Berhasil membuat ${Object.keys(spendingByCategory).length} budget awal untuk pengguna ${uid}.`);
    return { success: true, message: "Rekomendasi budget berhasil dibuat!" };
});

/**
 * Memicu setiap kali transaksi baru dibuat, untuk mengupdate budget yang sesuai.
 */
export const updateBudgetOnTransaction = onDocumentCreated(firestoreTriggerOptions, async (event) => {
    const snapshot = event.data;
    if (!snapshot) { return; }

    const transaction = snapshot.data();
    const uid = event.params.userId;

    if (transaction.type !== 'expense') {
        return; // Hanya proses pengeluaran
    }

    const transactionMonth = (transaction.createdAt as Timestamp).toDate().toISOString().slice(0, 7);
    const budgetId = `${transactionMonth}_${transaction.category}`;
    const budgetRef = db.collection('users').doc(uid).collection('budgets').doc(budgetId);

    try {
        const budgetDoc = await budgetRef.get();
        if (!budgetDoc.exists) {
            logger.info(`Tidak ada budget ditemukan untuk kategori "${transaction.category}" bulan ${transactionMonth} untuk pengguna ${uid}.`);
            return;
        }

        const budgetData = budgetDoc.data();
        if (!budgetData) return;

        // Update jumlah yang sudah dibelanjakan
        await budgetRef.update({ spentAmount: FieldValue.increment(transaction.amount) });

        // Cek apakah budget hampir habis dan perlu notifikasi
        const newSpentAmount = budgetData.spentAmount + transaction.amount;
        const budgetUsage = (newSpentAmount / budgetData.budgetedAmount) * 100;

        // Kirim insight jika penggunaan > 80% dan belum pernah dikirim sebelumnya
        if (budgetUsage > 80 && !budgetData.warningSent) {
            const insightText = `🔥 PERINGATAN! Budget lo buat "${transaction.category}" udah kepake ${Math.round(budgetUsage)}%. Rem pengeluaran lo sekarang juga!`;
            await db.collection('users').doc(uid).collection('insights').add({
                text: insightText,
                createdAt: Timestamp.now(),
                isRead: false,
            });
            // Tandai agar tidak mengirim notifikasi yang sama berulang kali
            await budgetRef.update({ warningSent: true });
            logger.info(`Mengirim peringatan budget untuk pengguna ${uid} kategori ${transaction.category}.`);
        }

    } catch (error) {
        logger.error(`Gagal mengupdate budget untuk pengguna ${uid}:`, error);
    }
});

// --- FUNGSI BARU UNTUK FASE 1: GAMIFIKASI & NUDGES ---

/**
 * Definisi Lencana (Badges) yang tersedia.
 */
const badges = {
    BEGINNER_LOGGER: {
        id: 'BEGINNER_LOGGER',
        name: 'Pencatat Pemula',
        description: 'Mencatat transaksi pertamamu.',
        insight: '🏆 Lencana "Pencatat Pemula" kebuka! Langkah pertama selalu yang paling berat, dan lo udah lewatin itu. Terus catat, jangan kendor!'
    },
    FIRST_PLANNER: {
        id: 'FIRST_PLANNER',
        name: 'Perencana Pertama',
        description: 'Membuat budget pertamamu.',
        insight: '🏆 Lencana "Perencana Pertama" buat lo! Sekarang lo bukan cuma ngikutin arus, tapi lo yang ngatur arusnya. Keren!'
    },
    THE_ALCHEMIST: {
        id: 'THE_ALCHEMIST',
        name: 'Sang Alkemis',
        description: 'Mencapai Kekayaan Bersih (Net Worth) positif untuk pertama kalinya.',
        insight: '🏆 GILA! Lencana "Sang Alkemis" berhasil lo dapetin! Lo udah berhasil ngubah "utang" jadi "aset". Ini titik balik besar, Bro/Mbak. Bangga gue!'
    }
};

/**
 * Memberikan lencana (badges) kepada pengguna berdasarkan pencapaian mereka.
 * Berjalan setiap hari pada jam 7 pagi.
 */
export const awardBehavioralBadges = onSchedule(gamificationScheduleOptions, async (event) => {
    logger.info("Memulai proses pemberian lencana harian...");

    const usersSnapshot = await db.collection('users').get();
    if (usersSnapshot.empty) {
        logger.info("Tidak ada pengguna untuk diproses.");
        return;
    }

    for (const userDoc of usersSnapshot.docs) {
        const uid = userDoc.id;
        // const userProfile = userDoc.data(); // <-- DIHAPUS: Baris ini yang menyebabkan peringatan.
        const userBadgesRef = db.collection('users').doc(uid).collection('badges');
        const userBadgesSnapshot = await userBadgesRef.get();
        const earnedBadgeIds = userBadgesSnapshot.docs.map(doc => doc.id);

        // --- Cek Lencana: Pencatat Pemula ---
        if (!earnedBadgeIds.includes(badges.BEGINNER_LOGGER.id)) {
            const transactionsSnapshot = await db.collection('users').doc(uid).collection('transactions').limit(1).get();
            if (!transactionsSnapshot.empty) {
                await awardBadge(uid, badges.BEGINNER_LOGGER);
            }
        }

        // --- Cek Lencana: Perencana Pertama ---
        if (!earnedBadgeIds.includes(badges.FIRST_PLANNER.id)) {
            const budgetsSnapshot = await db.collection('users').doc(uid).collection('budgets').limit(1).get();
            if (!budgetsSnapshot.empty) {
                await awardBadge(uid, badges.FIRST_PLANNER);
            }
        }
        
        // --- Cek Lencana: Sang Alkemis ---
        if (!earnedBadgeIds.includes(badges.THE_ALCHEMIST.id)) {
            // Kita asumsikan net worth dihitung dan disimpan di profil pengguna
            const assetsSnapshot = await db.collection('users').doc(uid).collection('assets').get();
            const liabilitiesSnapshot = await db.collection('users').doc(uid).collection('liabilities').get();
            const totalAssets = assetsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().value || 0), 0);
            const totalLiabilities = liabilitiesSnapshot.docs.reduce((sum, doc) => sum + (doc.data().value || 0), 0);
            const netWorth = totalAssets - totalLiabilities;

            if (netWorth > 0) {
                await awardBadge(uid, badges.THE_ALCHEMIST);
            }
        }
    }

    logger.info("Proses pemberian lencana harian selesai.");
});

/**
 * Helper function untuk menyimpan lencana dan membuat insight.
 */
async function awardBadge(uid: string, badge: { id: string; name: string; insight: string; }) {
    try {
        // Simpan lencana ke sub-koleksi
        await db.collection('users').doc(uid).collection('badges').doc(badge.id).set({
            name: badge.name,
            earnedAt: Timestamp.now()
        });

        // Kirim insight notifikasi ke pengguna
        await db.collection('users').doc(uid).collection('insights').add({
            text: badge.insight,
            createdAt: Timestamp.now(),
            isRead: false,
        });
        logger.info(`Lencana "${badge.name}" diberikan kepada pengguna ${uid}.`);
    } catch (error) {
        logger.error(`Gagal memberikan lencana "${badge.name}" kepada pengguna ${uid}:`, error);
    }
}

// --- FUNGSI BARU UNTUK FASE 1: FINANCIAL HEALTH SCORE ---

/**
 * Menghitung Financial Health Score untuk semua pengguna.
 * Berjalan setiap minggu pada Minggu jam 2 pagi.
 */
export const calculateFinancialHealthScore = onSchedule(healthScoreScheduleOptions, async (event) => {
    logger.info("Memulai kalkulasi Financial Health Score mingguan...");

    const usersSnapshot = await db.collection('users').get();
    if (usersSnapshot.empty) {
        logger.info("Tidak ada pengguna untuk diproses.");
        return;
    }

    for (const userDoc of usersSnapshot.docs) {
        const uid = userDoc.id;
        try {
            // --- 1. Data Gathering ---
            const ninetyDaysAgo = Timestamp.fromMillis(Date.now() - 90 * 24 * 60 * 60 * 1000);
            
            // Aset & Liabilitas
            const assetsSnapshot = await db.collection('users').doc(uid).collection('assets').get();
            const liabilitiesSnapshot = await db.collection('users').doc(uid).collection('liabilities').get();
            const totalAssets = assetsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().value || 0), 0);
            const totalLiabilities = liabilitiesSnapshot.docs.reduce((sum, doc) => sum + (doc.data().value || 0), 0);
            const netWorth = totalAssets - totalLiabilities;
            const emergencyFund = assetsSnapshot.docs
                .filter(doc => doc.data().category === 'Tabungan' || doc.data().category === 'Dana Darurat')
                .reduce((sum, doc) => sum + (doc.data().value || 0), 0);

            // Transaksi 90 hari terakhir
            const transactionsSnapshot = await db.collection('users').doc(uid).collection('transactions')
                .where('createdAt', '>=', ninetyDaysAgo).get();
            let totalIncome = 0;
            let totalExpense = 0;
            transactionsSnapshot.forEach(doc => {
                const t = doc.data();
                if (t.type === 'income') totalIncome += t.amount;
                else totalExpense += t.amount;
            });
            const avgMonthlyExpense = totalExpense / 3;

            // Kepatuhan Budget bulan lalu
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            const lastMonthStr = lastMonth.toISOString().slice(0, 7);
            const budgetsSnapshot = await db.collection('users').doc(uid).collection('budgets').where('month', '==', lastMonthStr).get();
            let overspentBudgets = 0;
            budgetsSnapshot.forEach(doc => {
                const b = doc.data();
                if (b.spentAmount > b.budgetedAmount) overspentBudgets++;
            });
            
            // --- 2. Scoring Logic (Total 1000 poin) ---
            // Skor Kekayaan Bersih (Maks 350)
            let netWorthScore = Math.max(0, 50 + (netWorth / 1000000)); // 1 poin per juta, mulai dari 50
            netWorthScore = Math.min(netWorthScore, 350);

            // Skor Tingkat Tabungan (Maks 300)
            const savingsRate = totalIncome > 0 ? (totalIncome - totalExpense) / totalIncome : 0;
            let savingsRateScore = Math.max(0, savingsRate * 1000); // 10% = 100 poin
            savingsRateScore = Math.min(savingsRateScore, 300);

            // Skor Dana Darurat (Maks 200)
            const emergencyCoverageMonths = avgMonthlyExpense > 0 ? emergencyFund / avgMonthlyExpense : 0;
            let emergencyFundScore = (emergencyCoverageMonths / 6) * 200; // Target 6 bulan = 200 poin
            emergencyFundScore = Math.min(emergencyFundScore, 200);

            // Skor Kepatuhan Budget (Maks 150)
            const totalBudgets = budgetsSnapshot.size;
            const budgetAdherence = totalBudgets > 0 ? (totalBudgets - overspentBudgets) / totalBudgets : 1;
            const budgetAdherenceScore = budgetAdherence * 150;

            const totalScore = Math.round(netWorthScore + savingsRateScore + emergencyFundScore + budgetAdherenceScore);

            // --- 3. Save to Profile ---
            const scoreData = {
                total: totalScore,
                netWorth: { score: Math.round(netWorthScore), value: netWorth },
                savingsRate: { score: Math.round(savingsRateScore), value: savingsRate },
                emergencyFund: { score: Math.round(emergencyFundScore), value: emergencyCoverageMonths },
                budgetAdherence: { score: Math.round(budgetAdherenceScore), value: budgetAdherence },
                lastCalculated: Timestamp.now()
            };
            
            await db.collection('users').doc(uid).update({ financialHealthScore: scoreData });
            logger.info(`Financial Health Score (${totalScore}) berhasil dihitung untuk pengguna ${uid}.`);

        } catch(error) {
            logger.error(`Gagal menghitung FHS untuk pengguna ${uid}:`, error);
        }
    }
});

// --- FUNGSI getStockPrice DIUBAH TOTAL UNTUK MENGGUNAKAN ALPHA VANTAGE ---

/**
 * Mengambil harga saham terbaru dari API Alpha Vantage.
 * Untuk pasar Indonesia, kita tambahkan suffix ".JK".
 */
export const getStockPrice = onCall(lightweightOptions, async (request) => {
    const { ticker } = request.data;
    if (!ticker || typeof ticker !== 'string') {
        throw new HttpsError('invalid-argument', 'Ticker saham wajib diisi.');
    }

    // --- PASTIKAN API KEY ANDA SUDAH BENAR DI SINI ---
    const ALPHA_VANTAGE_API_KEY = "TIFXIPOT2AQJZXQZ"; 

    const formattedTicker = ticker.toUpperCase().endsWith('.JK') 
        ? ticker.toUpperCase() 
        : `${ticker.toUpperCase()}.JK`;
    
    // PERUBAHAN UTAMA: Menggunakan TIME_SERIES_DAILY dengan outputsize=compact
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${formattedTicker}&outputsize=compact&apikey=${ALPHA_VANTAGE_API_KEY}`;
    
    logger.info(`Mencoba mengambil data dari Alpha Vantage (Daily) untuk: ${formattedTicker}`);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            logger.error(`Alpha Vantage API request gagal dengan status ${response.status}.`);
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        
        // Cek jika ada pesan error atau rate limit dari API
        if (data.Note || data["Error Message"]) {
            logger.warn(`Respons tidak valid dari Alpha Vantage: ${JSON.stringify(data)}`);
            throw new HttpsError('not-found', `Gagal mengambil data untuk ${ticker.toUpperCase()}. Mungkin karena limit API gratis atau kode salah.`);
        }
        
        // PERUBAHAN LOGIKA PARSING: Mengambil data dari time series
        const timeSeries = data['Time Series (Daily)'];
        if (!timeSeries) {
            throw new HttpsError('not-found', `Tidak ada data time series untuk saham ${ticker.toUpperCase()}.`);
        }

        // Ambil tanggal terbaru (kunci pertama dari objek time series)
        const latestDate = Object.keys(timeSeries)[0];
        if (!latestDate) {
            throw new HttpsError('not-found', `Tidak ada data tanggal yang tersedia untuk ${ticker.toUpperCase()}.`);
        }

        // Ambil harga penutupan (close price) dari tanggal terbaru
        const priceString = timeSeries[latestDate]['4. close'];
        if (!priceString) {
             throw new HttpsError('not-found', `Tidak bisa menemukan harga penutupan untuk saham ${ticker.toUpperCase()}.`);
        }

        const price = parseFloat(priceString);
        logger.info(`Harga penutupan terakhir untuk ${ticker.toUpperCase()} adalah: ${price}`);
        return { success: true, price: price };

    } catch (error: any) {
        logger.error(`Gagal mengambil harga saham untuk ${ticker}:`, error);
        if (error.code === 'not-found') throw error;
        throw new HttpsError('internal', 'Gagal terhubung ke layanan data saham.');
    }
});

// =====================================================================
// FUNGSI BARU: Analisis Proyeksi Kekayaan
// =====================================================================
export const getProjectionAnalysis = onCall(aiCallOptions, async (request) => {
    if (!request.auth) {
        throw new Error("Authentication required.");
    }
    const uid = request.auth.uid;
    const { 
        initialNetWorth, 
        finalNetWorth, 
        years, 
        avgMonthlyCashflow, 
        additionalInvestment 
    } = request.data;

    logger.info(`Generating projection analysis for user: ${uid}`);

    try {
        const totalMonthlyInvestment = avgMonthlyCashflow + additionalInvestment;

        const prompt = `
            Anda dalam "Mode Strategist" (Persona Kalimasada). Analisis data proyeksi keuangan pengguna ini.
            
            KONTEKS DATA:
            - Kekayaan Bersih Awal: Rp ${initialNetWorth.toLocaleString('id-ID')}
            - Proyeksi Kekayaan Bersih Akhir: Rp ${finalNetWorth.toLocaleString('id-ID')}
            - Jangka Waktu: ${years} tahun
            - Total Investasi Bulanan (Rata-rata + Tambahan): Rp ${totalMonthlyInvestment.toLocaleString('id-ID')}

            TUGAS ANDA:
            1. Berikan komentar singkat tentang hasil proyeksi ini. Apakah ini pertumbuhan yang agresif atau konservatif?
            2. Berikan SATU saran paling tajam dan bisa dieksekusi (actionable) untuk mengakselerasi pertumbuhan ini.
            3. Jaga persona Anda yang blak-blakan, analitis, dan berorientasi pada hasil. Gunakan format Markdown dan emoji.
        `;

        const result = await generativeModel.generateContent(prompt);
        const analysisText = result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? "Tidak ada insight khusus saat ini. Coba lagi nanti.";

        return { success: true, analysis: analysisText };

    } catch (error) {
        logger.error(`Error generating projection analysis for user ${uid}:`, error);
        throw new Error("Failed to generate projection analysis.");
    }
});

// Fungsi helper untuk membuat misi
async function createSingleMission(uid: string, mission: any) {
    if (!mission || typeof mission !== 'object') {
        throw new HttpsError('invalid-argument', 'A single mission object is required.');
    }
    logger.info(`Attempting to create mission for user ${uid}:`, mission);
    try {
        const missionsCollection = db.collection('users').doc(uid).collection('missions');
        await missionsCollection.add({
            ...mission,
            status: 'active',
            createdAt: Timestamp.now(),
            userId: uid,
        });
        logger.info(`SUCCESS: New active mission "${mission.title}" created for user ${uid}.`);
    } catch (error) {
        logger.error(`Error creating mission for user ${uid}:`, error);
        throw new HttpsError('internal', "Failed to create mission.");
    }
}

// FUNGSI LAMA (sekarang menjadi wrapper): Ini yang diekspos sebagai endpoint
export const createMissionPath = onCall(lightweightOptions, async (request) => {
    if (!request.auth) { throw new HttpsError('unauthenticated', 'Authentication required.'); }
    const uid = request.auth.uid;
    const { mission } = request.data;
    
    await createSingleMission(uid, mission);
    
    return { success: true, message: `Mission created.` };
});



// =====================================================================
// FUNGSI BARU: Analisis Keuangan On-Demand
// =====================================================================
export const getFinancialAnalysis = onCall(aiCallOptions, async (request) => {
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
export const weeklyFinancialCheckup = onSchedule(scheduleOptions, async (event) => {
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
export const scanReceipt = onCall(aiCallOptions, async (request) => {
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
export const detectAnomalyOnTransaction = onDocumentCreated(firestoreTriggerOptions, async (event) => {
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
export const markOnboardingComplete = onCall(lightweightOptions, async (request) => {
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

// --- FUNGSI BARU UNTUK UPDATE PROFIL PENGGUNA ---
export const updateUserProfile = onCall(lightweightOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Authentication required.');
    }
    const uid = request.auth.uid;
    const { gender } = request.data;

    if (gender !== 'male' && gender !== 'female') {
        throw new HttpsError('invalid-argument', 'Gender must be either "male" or "female".');
    }

    try {
        const userProfileRef = db.collection('users').doc(uid);
        await userProfileRef.set({ gender: gender }, { merge: true });
        logger.info(`User ${uid} has set their gender to ${gender}.`);
        return { success: true };
    } catch (error) {
        logger.error(`Error updating profile for user ${uid}:`, error);
        throw new HttpsError('internal', 'Failed to update user profile.');
    }
});


// Fungsi helper baru untuk membersihkan Markdown
function stripMarkdown(text: string): string {
    return text
        // Hapus bold (**) dan italic (*)
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        // Hapus heading (#)
        .replace(/#+\s/g, '')
        // Hapus list items (*, -, +)
        .replace(/^[*\-+] /gm, '')
        // Hapus link markdown, tapi pertahankan teksnya
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        // Hapus gambar markdown
        .replace(/!\[.*?\]\(.*?\)/g, '');
}

// Fungsi Chat Utama dengan Chunked TTS
export const askMentorAI = onCall(aiCallOptions, async (request) => {
    if (!request.auth) { throw new HttpsError('unauthenticated', 'Authentication required.'); }
    const uid = request.auth.uid;
    const { prompt: userInput, history: clientHistory, inputType } = request.data;

    if (!userInput) { throw new HttpsError('invalid-argument', 'User input is required.'); }

    try {
        const queryEmbedding = await getEmbedding(userInput);
        const knowledgeSnapshot = await db.collection('knowledge_base').findNearest('embedding', queryEmbedding, { limit: 3, distanceMeasure: 'COSINE' }).get();
        const relevantKnowledge = knowledgeSnapshot.docs.map(doc => `- ${doc.data().content}`).join('\n');
        
        const profileSnapshot = await db.collection('users').doc(uid).get();
        const userProfile = profileSnapshot.data();
        const userGender = userProfile?.gender || 'unknown';

        const assetsSnapshot = await db.collection('users').doc(uid).collection('assets').get();
        const liabilitiesSnapshot = await db.collection('users').doc(uid).collection('liabilities').get();
        const totalAssets = assetsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().value || 0), 0);
        const totalLiabilities = liabilitiesSnapshot.docs.reduce((sum, doc) => sum + (doc.data().value || 0), 0);
        const netWorth = totalAssets - totalLiabilities;
        const userXP = userProfile?.xp || 0;

        const context = `
          ---
          GENDER PENGGUNA: ${userGender}
          ---
          PENGETAHUAN RELEVAN DARI MEMORI OTAK:
          ${relevantKnowledge.length > 0 ? relevantKnowledge : "Tidak ada pengetahuan spesifik yang ditemukan."}
          ---
          USER'S CURRENT FINANCIAL CONTEXT:
          - Net Worth: IDR ${netWorth.toLocaleString('id-ID')}
          - Current XP: ${userXP}
          ---
        `;
        
        const fullPrompt = `${context}\n\nUser's Question: "${userInput}"`;
        const chat = generativeModel.startChat({ history: clientHistory || [] });
        const result1 = await chat.sendMessage(fullPrompt);
        
        const response1 = result1.response;
        const candidate1 = response1.candidates?.[0];
        if (!candidate1) { throw new HttpsError('internal', 'No response candidate from AI.'); }
        
        let finalResponseText = candidate1.content?.parts.find(p => p.text)?.text ?? "Maaf, terjadi kesalahan.";

        const functionCallPart = candidate1.content?.parts.find(part => !!part.functionCall);
        // --- PERBAIKAN UTAMA DIMULAI DI SINI ---
        if (functionCallPart && functionCallPart.functionCall) {
            logger.info("Function call detected:", JSON.stringify(functionCallPart.functionCall));
            
            const { name, args } = functionCallPart.functionCall;
            if (name === 'createMissionPath') {
                const missionArgs = args as { mission: object };
                
                try {
                    // Eksekusi fungsi yang diminta
                    await createSingleMission(uid, missionArgs.mission);
                    
                    // Langkah 2: Kirim hasil eksekusi kembali ke model
                    const functionResponse: Part = {
                        functionResponse: {
                            name: 'createMissionPath',
                            response: { success: true, message: 'Misi berhasil dibuat.' }
                        }
                    };
                    
                    const result2 = await chat.sendMessage([functionResponse]);
                    const response2 = result2.response;
                    const finalResponseText = response2.candidates?.[0]?.content?.parts?.[0]?.text ?? "Misi baru buat lo udah gue siapkan.";

                    // Kembalikan respons teks akhir dari AI setelah fungsi dieksekusi
                    return { textResponse: finalResponseText, audioUrl: null };

                } catch (error) {
                    logger.error("Error executing createSingleMission:", error);
                    throw new HttpsError('internal', 'Gagal membuat misi di database.');
                }
            }
        }

        if (inputType === 'voice') {
            logger.info(`Input is voice, preparing chunked TTS for user ${uid}`);

            const cleanTextForSpeech = stripMarkdown(finalResponseText);
            const sentences = cleanTextForSpeech.match(/[^.!?]+[.!?]+/g) || [cleanTextForSpeech];
            
            const audioUrls: string[] = [];
            const bucket = storage.bucket();
            const timestamp = Date.now();

            for (let i = 0; i < sentences.length; i++) {
                const sentence = sentences[i];
                if (sentence.trim().length === 0) continue;

                const ttsRequest = {
                    input: { text: sentence },
                    voice: { languageCode: 'id-ID', name: 'id-ID-Chirp3-HD-Schedar' },
                    audioConfig: { audioEncoding: 'MP3' as const },
                };

                const [ttsResponse] = await ttsClient.synthesizeSpeech(ttsRequest);
                const audioContent = ttsResponse.audioContent;
                if (!audioContent) continue;

                const fileName = `tts-audio/${uid}/${timestamp}_${i}.mp3`;
                const file = bucket.file(fileName);

                await file.save(audioContent as Buffer, { metadata: { contentType: 'audio/mpeg' } });
                await file.makePublic();
                audioUrls.push(file.publicUrl());
            }
            
            logger.info(`Generated ${audioUrls.length} audio chunks.`);
            return { textResponse: finalResponseText, audioUrls: audioUrls };
        } else {
            logger.info(`Input is text, returning text-only response for user ${uid}`);
            return { textResponse: finalResponseText, audioUrls: null };
        }

    } catch (error: any) {
        logger.error("!!! ERROR in askMentorAI:", JSON.stringify(error, null, 2));
        throw new HttpsError('internal', `Terjadi kesalahan: ${error.message}`);
    }
});


export const setAdminClaim = onCall(lightweightOptions, async (request) => {
    if (!request.auth) {
        // PERBAIKAN: Menggunakan HttpsError secara langsung
        throw new HttpsError('unauthenticated', 'Authentication required.');
    }
    const uid = request.auth.uid;
    logger.info(`Attempting to set admin claim for user: ${uid}`);

    try {
        await getAuth().setCustomUserClaims(uid, { admin: true });
        logger.info(`Successfully set admin claim for user ${uid}`);
        return { message: `Success! User ${uid} is now an admin.` };
    } catch (error) {
        logger.error(`Error setting admin claim for ${uid}:`, error);
        // PERBAIKAN: Menggunakan HttpsError secara langsung
        throw new HttpsError('internal', 'Failed to set admin claim. Check function logs for details.');
    }
});


// Fungsi untuk menambah transaksi dan memberi XP
export const addTransaction = onCall(lightweightOptions, async (request) => {
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

// =====================================================================
// FUNGSI MISI DENGAN LOGIKA DINAMIS & SUB-MISI
// =====================================================================

export const completeMission = onCall(lightweightOptions, async (request) => {
    if (!request.auth) { throw new HttpsError('unauthenticated', 'Authentication required.'); } 
    const uid = request.auth.uid; 
    const { missionId, xpGained } = request.data; 
    if (!missionId) { throw new HttpsError('invalid-argument', "Mission ID is required."); } 

    try {
        const missionRef = db.collection('users').doc(uid).collection('missions').doc(missionId);
        const missionDoc = await missionRef.get();
        if (!missionDoc.exists) { throw new HttpsError('not-found', 'Mission not found.'); }
        
        const missionData = missionDoc.data();
        const currentTangga = missionData?.tangga || 0;
        const currentSubStep = missionData?.subStep || 0;

        const userProfileRef = db.collection('users').doc(uid); 
        
        const batch = db.batch();
        batch.update(missionRef, { status: 'completed' }); 
        batch.update(userProfileRef, { xp: FieldValue.increment(xpGained || 100) }); 
        await batch.commit();

        await advanceToNextMission(uid, currentTangga, currentSubStep);
        
        return { success: true, message: `Gained ${xpGained || 100} XP!` }; 
    } catch (error) { 
        logger.error(`Error completing mission for user ${uid}:`, error);
        throw new HttpsError('internal', "Failed to complete mission."); 
    }
});


// FUNGSI BARU: Untuk membuat misi berikutnya secara dinamis
async function advanceToNextMission(uid: string, completedTangga: number, completedSubStep: number) {
    logger.info(`Advancing user ${uid} from Tangga ${completedTangga}, Sub-step ${completedSubStep}`);

    try {
        // 1. Analisis Profil Pengguna Secara Mendalam
        const ninetyDaysAgo = Timestamp.fromMillis(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const transactionsSnapshot = await db.collection('users').doc(uid).collection('transactions')
            .where('createdAt', '>=', ninetyDaysAgo)
            .get();

        let totalIncome = 0;
        let totalExpense = 0;
        transactionsSnapshot.forEach(doc => {
            const t = doc.data();
            if (t.type === 'income') totalIncome += t.amount;
            else totalExpense += t.amount;
        });

        const avgMonthlyIncome = totalIncome / 3;
        const avgMonthlyExpense = totalExpense / 3;

        const profileSnapshot = await db.collection('users').doc(uid).get();
        const netWorth = profileSnapshot.data()?.netWorth || 0;

        // 2. Buat Prompt Dinamis untuk AI
        const prompt = `
            Seorang pengguna baru saja menyelesaikan misi untuk Tangga ${completedTangga} (sub-misi ${completedSubStep}).
            Kondisi keuangan mereka saat ini:
            - Net Worth: Rp ${netWorth.toLocaleString('id-ID')}
            - Rata-rata Pemasukan Bulanan (3 bln terakhir): Rp ${avgMonthlyIncome.toLocaleString('id-ID')}
            - Rata-rata Pengeluaran Bulanan (3 bln terakhir): Rp ${avgMonthlyExpense.toLocaleString('id-ID')}

            Tugasmu: Berdasarkan kurikulum "Tangga Ternak Uang", tentukan dan buatkan **SATU sub-misi berikutnya** yang paling logis dan bisa dicapai untuk pengguna ini. Jika mereka sudah menyelesaikan semua sub-misi di satu tangga, buatkan sub-misi pertama untuk tangga berikutnya. Gunakan *tool* \`createMissionPath\`.
        `;

        // 3. Minta AI Membuat Misi
        const result = await generativeModel.generateContent(prompt);
        const response = result.response;
        const functionCallPart = response.candidates?.[0]?.content?.parts.find(part => !!part.functionCall);

        if (functionCallPart && functionCallPart.functionCall) {
            const { name, args } = functionCallPart.functionCall;
            if (name === 'createMissionPath') {
                const missionArgs = args as { mission: object };
                await createSingleMission(uid, missionArgs.mission);
                logger.info(`AI successfully generated next dynamic mission for user ${uid}.`);
            }
        } else {
             await db.collection('users').doc(uid).collection('insights').add({
                text: `Mantap, Bro! 🔥 Lo udah naklukin misi terakhir. Di chat berikutnya, tanya gue "apa misi selanjutnya?" buat lanjut ke level berikutnya!`,
                createdAt: Timestamp.now(),
                isRead: false,
            });
        }

    } catch (error) {
        logger.error(`Failed to dynamically advance user ${uid} to next mission:`, error);
    }
}

