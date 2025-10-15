// api/save-jalons.js
// 🚨 Nécessite Node.js 18+ ou une version moderne de Vercel pour le 'fetch' global

/**
 * Fonction Serverless Vercel pour mettre à jour un fichier sur GitHub
 * @param {object} req - Requête HTTP entrante
 * @param {object} res - Réponse HTTP sortante
 */
export default async function handler(req, res) {
    // 1. Gérer les méthodes HTTP (n'accepter que POST)
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Seules les requêtes POST sont autorisées.' });
    }

    // 2. Sécurité : Récupérer le Token GitHub de manière sécurisée
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const OWNER = 'Mitean';
    const REPO = 'frise-access';
    const FILE_PATH = 'bdd.js';

    if (!GITHUB_TOKEN) {
        return res.status(500).json({ message: 'Erreur: Token GitHub non configuré dans les variables d’environnement.' });
    }

    try {
        const { newContent } = req.body; // Récupère le nouveau contenu du fichier envoyé par l'éditeur

        if (!newContent) {
            return res.status(400).json({ message: 'Le contenu du fichier est manquant.' });
        }
        
        // --- 3. API GitHub : Récupérer le SHA actuel du fichier ---
        // Le SHA est nécessaire pour mettre à jour un fichier (preuve que l'on travaille sur la dernière version)
        const contentUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;
        
        const contentResponse = await fetch(contentUrl, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'User-Agent': 'Vercel-API-Updater'
            }
        });

        if (!contentResponse.ok) {
            // Cela peut arriver si le fichier n'existe pas, ou si le token est mauvais
             return res.status(contentResponse.status).json({ message: `Erreur à la récupération du SHA: ${contentResponse.statusText}` });
        }
        
        const contentData = await contentResponse.json();
        const currentSha = contentData.sha;
        
        // --- 4. API GitHub : Envoyer la Mise à Jour (PUT) ---
        
        // Le contenu doit être encodé en Base64 pour l'API GitHub
        const base64Content = Buffer.from(newContent).toString('base64');

        const updateResponse = await fetch(contentUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Vercel-API-Updater'
            },
            body: JSON.stringify({
                message: `🤖 Mise à jour automatique de bdd.js (v${Date.now()})`, // Message de commit
                content: base64Content,
                sha: currentSha, // Le SHA est obligatoire
                branch: 'main' // Assurez-vous que c'est bien la branche 'main'
            })
        });

        if (!updateResponse.ok) {
            const error = await updateResponse.json();
            return res.status(updateResponse.status).json({ message: `Erreur à l'écriture GitHub: ${error.message}` });
        }

        // Succès
        return res.status(200).json({ success: true, commitUrl: updateResponse.url });

    } catch (error) {
        console.error('Erreur du serveur Vercel:', error);
        return res.status(500).json({ message: 'Erreur interne du serveur.', error: error.message });
    }
}