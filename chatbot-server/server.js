const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const OpenAI = require("openai");
const multer = require("multer");
const TelegramBot = require('node-telegram-bot-api');
const { Octokit } = require("@octokit/rest");
const simpleGit = require('simple-git');
const axios = require('axios');

dotenv.config();

const app = express();
app.use(cors({ origin: "*" }));
app.use(bodyParser.json());
app.use(express.json());

require("dotenv").config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Paths
const dbDir = path.join(__dirname, "db");
const websiteDir = path.join(__dirname, "webSite");

// Function to get user-specific file paths
const getUserFiles = (userId) => {
  if (!userId) {
    throw new Error('User ID is required');
  }
  const userDbDir = path.join(dbDir, userId);
  if (!fs.existsSync(userDbDir)) {
    fs.mkdirSync(userDbDir, { recursive: true });
  }
  return {
    historyFile: path.join(userDbDir, "chat-history.json"),
    profileFile: path.join(userDbDir, "user-profile.json"),
    imagesDir: path.join(userDbDir, "images"),
    websiteDir: path.join(userDbDir, "website")
  };
};

// Function to get user-specific upload directory
const getUserUploadDir = (userId) => {
  const userUploadDir = path.join(dbDir, userId, "uploads");
  if (!fs.existsSync(userUploadDir)) {
    fs.mkdirSync(userUploadDir, { recursive: true });
  }
  return userUploadDir;
};

// Initialize user files if they don't exist
const initializeUserFiles = (userId) => {
  try {
    if (!userId) {
      console.error('Error: User ID is undefined or null');
      return false;
    }
    // console.log('Initializing files for user:', userId);
    const files = getUserFiles(userId);
    if (!fs.existsSync(files.historyFile)) {
      fs.writeFileSync(files.historyFile, "[]");
    }
    if (!fs.existsSync(files.profileFile)) {
      fs.writeFileSync(files.profileFile, "{}");
    }
    if (!fs.existsSync(files.imagesDir)) {
      fs.mkdirSync(files.imagesDir, { recursive: true });
    }
    if (!fs.existsSync(files.websiteDir)) {
      fs.mkdirSync(files.websiteDir, { recursive: true });
    }
    return true;
  } catch (error) {
    console.error('Error initializing user files:', error);
    return false;
  }
};

// Static folder for uploaded images - serve from user directories
app.use("/uploads/:userId", express.static(path.join(dbDir, ":userId", "uploads")));

// Static folder to serve webSite
app.use("/webSite", express.static(websiteDir));

// Static folder for serving user images
app.use("/images/:userId", express.static(path.join(dbDir, ":userId", "images")));

// File upload config (image upload)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.params.userId;
    const files = getUserFiles(userId);
    cb(null, files.imagesDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = file.originalname;
    const extension = path.extname(originalName);
    const filename = `${timestamp}-${originalName}`;
    cb(null, filename);
  }
});
const upload = multer({ storage: storage });

// GET: Serve chat history
app.get("/history/:userId", (req, res) => {
  const { userId } = req.params;
  const files = getUserFiles(userId);
  const chatHistory = JSON.parse(fs.readFileSync(files.historyFile));
  res.json(chatHistory);
});

// GET: Serve user profile
app.get("/profile/:userId", (req, res) => {
  const { userId } = req.params;
  const files = getUserFiles(userId);
  const userProfile = JSON.parse(fs.readFileSync(files.profileFile));
  res.json(userProfile);
});

// GET: Serve current webSite code
app.get("/get-webSite-code", async (req, res) => {
  const files = ["index.html", "stylesss.css", "script.js"];
  const code = {};

  try {
    files.forEach((file) => {
      const filePath = path.join(websiteDir, file);
      if (fs.existsSync(filePath)) {
        code[file] = fs.readFileSync(filePath, "utf-8");
      } else {
        code[file] = "// File not found";
      }
    });

    res.json(code);
  } catch (err) {
    console.error("Error reading webSite code:", err);
    res.status(500).json({ error: "Failed to load webSite code" });
  }
});

// POST: Upload multiple images with a text and analyze using OpenAI
app.post("/upload-image/:userId", upload.array("images", 10), async (req, res) => {
  try {
    const { userId } = req.params;
    const files = req.files;
    const userText = req.body.text || "";
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const userFiles = getUserFiles(userId);
    const userProfile = JSON.parse(fs.readFileSync(userFiles.profileFile));
    const chatHistory = JSON.parse(fs.readFileSync(userFiles.historyFile));

    // Ensure images field exists
    if (!userProfile.images) userProfile.images = [];

    const newImagesData = [];

    for (const file of files) {
      const imagePath = file.path; // This will now be in the user's images directory

      // Call OpenAI to analyze the image
      const analysis = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that describes images.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "What kind of image is this and what is its use?",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/${path.extname(file.filename).slice(1)};base64,${fs.readFileSync(imagePath, {
                    encoding: "base64",
                  })}`,
                },
              },
            ],
          },
        ],
        max_tokens: 200,
      });

      const aiDescription = analysis.choices[0].message.content;

      const imageData = {
        filename: file.filename,
        originalname: file.originalname,
        url: `/images/${userId}/${file.filename}`, // Updated URL path
        uploadedAt: new Date().toISOString(),
        description: userText,
        aiAnalysis: aiDescription,
      };

      userProfile.images.push(imageData);
      newImagesData.push(imageData);
    }

    // Add to chat history
    chatHistory.push({
      user: `Uploaded ${files.length} image(s) with text: "${userText}"`,
      bot: newImagesData
        .map((img) => `AI Analysis for ${img.originalname}: ${img.aiAnalysis}`)
        .join("\n\n"),
    });

    // Save profile and history
    fs.writeFileSync(userFiles.profileFile, JSON.stringify(userProfile, null, 2));
    fs.writeFileSync(userFiles.historyFile, JSON.stringify(chatHistory, null, 2));

    res.status(200).json({
      success: true,
      images: newImagesData,
      message: "Images uploaded and analyzed successfully.",
    });
  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ error: "Image upload or analysis failed." });
  }
});

// POST: Reset user profile and history
app.get("/reset/:userId", (req, res) => {
  try {
    const { userId } = req.params;
    const userFiles = getUserFiles(userId);
    const defaultProfile = {
      websiteType: "",
      targetAudience: "",
      mainGoal: "",
      colorScheme: "",
      theme: "",
      pages: [],
      sections: [],
      features: [],
      content: {},
      designPreferences: {},
      images: [],
      fonts: "",
      contactInfo: {},
      socialLinks: {},
      customScripts: "",
      branding: {},
      updateRequests: [],
      additionalNotes: "",
    };

    fs.writeFileSync(userFiles.historyFile, `[]`);
    fs.writeFileSync(userFiles.profileFile, JSON.stringify(defaultProfile, null, 2));
    res.status(200).json({ message: "Files reset successfully" });
  } catch (error) {
    console.error("Reset Error:", error);
    res.status(500).json({ error: "Failed to reset files" });
  }
});

// Function to generate the chat prompt
const generateChatPrompt = (formattedConversation, userProfile) => {
  return `
You are a helpful assistant that talks to users to understand and build their ideal website.

Here is the existing chat history:
${formattedConversation}

Here is the current user profile:
${JSON.stringify(userProfile, null, 2)}

Your goals:
- Ask relevant questions to understand the user's needs for their website.
- Update the profile accordingly.
- If the user asks to change something (e.g. color, layout), update "updateRequests".
- Be friendly and interactive, and make sure to guide the user step by step.
- If user is asking something or requests changes, respond helpfully and then ask the next relevant question.
- Respond ONLY in this JSON format:
{ "nextQuestion": "string", "updatedUserProfile": { ... } }
IMPORTANT: Do NOT include any markdown or backticks. Just return the JSON.
  `.trim();
};

// POST: Quick profile-building chat
app.post("/chat/:userId", async (req, res) => {
  const { userId } = req.params;
  const { message } = req.body;

  try {
    const userFiles = getUserFiles(userId);
    const chatHistory = JSON.parse(fs.readFileSync(userFiles.historyFile));
    const userProfile = JSON.parse(fs.readFileSync(userFiles.profileFile));
    const updatedHistory = [...chatHistory, { user: message, bot: "" }];

    const formattedConversation = updatedHistory
      .map((entry) =>
        entry.user && entry.bot
          ? `User: ${entry.user}\nBot: ${entry.bot}`
          : `User: ${entry.user}`
      )
      .join("\n");

    const promptQuick = generateChatPrompt(formattedConversation, userProfile);

    const quickResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: promptQuick }],
    });

    let responseText = quickResponse.choices[0].message.content;

    // Clean up markdown formatting if present
    responseText = responseText.replace(/```json|```/g, "").trim();

    let parsedQuick;
    try {
      parsedQuick = JSON.parse(responseText);
    } catch (err) {
      console.error("❌ Failed to parse JSON from OpenAI:", responseText);
      return res.status(500).json({
        error: "Invalid JSON received from OpenAI",
        rawResponse: responseText,
      });
    }

    updatedHistory[updatedHistory.length - 1].bot = parsedQuick.nextQuestion;

    fs.writeFileSync(userFiles.historyFile, JSON.stringify(updatedHistory, null, 2));
    fs.writeFileSync(userFiles.profileFile, JSON.stringify(parsedQuick.updatedUserProfile, null, 2));

    res.json({
      reply: parsedQuick.nextQuestion,
      chatHistory: updatedHistory,
    });
  } catch (error) {
    console.error("Chat Error:", error.message);
    res.status(500).json({ error: "Failed to get reply from OpenAI" });
  }
});

// POST: Generate dynamic webSite from profile
app.post("/promptBackground", async (req, res) => {
  try {
    const userProfile = JSON.parse(fs.readFileSync(profileFile));
    const chatHistory = JSON.parse(fs.readFileSync(historyFile));
    const websiteCode = {
      html: fs.readFileSync(path.join(websiteDir, "index.html"), "utf-8"),
      css: fs.readFileSync(path.join(websiteDir, "stylesss.css"), "utf-8"),
      js: fs.readFileSync(path.join(websiteDir, "script.js"), "utf-8"),
    };

    const systemPromptBackground = `
You are a full-stack AI developer. Create a dynamic, multi-page website using only one HTML file, one CSS file, and one JavaScript file. The website must be fully functional and stylessd using CSS. JavaScript should handle all interactivity and dynamic behavior.

Here is the user's desired website information:
${JSON.stringify(userProfile, null, 2)}
${JSON.stringify(chatHistory, null, 2)}

Here is the current website code:
HTML:
${websiteCode.html}

CSS:
${websiteCode.css}

JS:
${websiteCode.js}

Your task:
- Update the HTML, CSS, and JS files to reflect the user's website preferences.
- Include all required pages and sections if listed.
- Insert placeholders like <span id="goal"> or <div id="about-section">.
- In script.js, fetch "/profile", "/history" and multiple pages website populate the HTML.
- Make the site responsive and visually appealing.
- Generate the dummy data in website according user need.
- Use clean and modern design, respecting colorScheme, theme, etc.

Respond ONLY in this JSON format:
{
  "updatedUserProfile": { ... },
  "updatedCode": {
    "html": "string",
    "css": "string",
    "js": "string"
  }
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPromptBackground }],
    });

    const content = response.choices[0].message.content;
    const parsed = JSON.parse(content);

    fs.writeFileSync(
      profileFile,
      JSON.stringify(parsed.updatedUserProfile, null, 2)
    );
    fs.writeFileSync(
      path.join(websiteDir, "index.html"),
      parsed.updatedCode.html
    );
    fs.writeFileSync(
      path.join(websiteDir, "styless.css"),
      parsed.updatedCode.css
    );
    fs.writeFileSync(path.join(websiteDir, "script.js"), parsed.updatedCode.js);

    res.status(200).json({ message: "WebSite updated successfully" });
  } catch (err) {
    console.error("Background update error:", err);
    res.status(500).json({ error: "Failed to update webSite" });
  }
});

// GitHub configuration
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const GITHUB_ORG = process.env.GITHUB_ORG || 'your-github-org';
const GITHUB_REPO_PREFIX = 'user-website-';

// Function to create or update GitHub repository
async function createOrUpdateRepo(userId, websiteData) {
  const repoName = `${GITHUB_REPO_PREFIX}${userId}`;
  const repoPath = path.join(__dirname, 'user-websites', userId);
  
  try {
    // Create local directory if it doesn't exist
    if (!fs.existsSync(repoPath)) {
      fs.mkdirSync(repoPath, { recursive: true });
    }

    // Initialize git repository
    const git = simpleGit(repoPath);
    
    // Check if repository exists on GitHub
    try {
      await octokit.repos.get({
        owner: GITHUB_ORG,
        repo: repoName
      });
    } catch (error) {
      if (error.status === 404) {
        // Create new repository if it doesn't exist
        await octokit.repos.createInOrg({
          org: GITHUB_ORG,
          name: repoName,
          private: false,
          auto_init: true,
          description: `Website for Telegram user ${userId}`,
          homepage: `https://${GITHUB_ORG}.github.io/${repoName}/`
        });
      } else {
        throw error;
      }
    }

    // Write website files
    fs.writeFileSync(path.join(repoPath, 'index.html'), websiteData.html);
    fs.writeFileSync(path.join(repoPath, 'styles.css'), websiteData.css);
    fs.writeFileSync(path.join(repoPath, 'script.js'), websiteData.js);

    // Add .nojekyll file to prevent GitHub Pages from processing with Jekyll
    fs.writeFileSync(path.join(repoPath, '.nojekyll'), '');

    // Commit and push changes
    await git
      .add('./*')
      .commit('Update website')
      .push('origin', 'main');

    // Enable GitHub Pages
    await octokit.repos.update({
      owner: GITHUB_ORG,
      repo: repoName,
      name: repoName,
      private: false,
      has_pages: true,
      source: {
        branch: 'main'
      }
    });

    // Wait a moment for GitHub Pages to start building
    await new Promise(resolve => setTimeout(resolve, 5000));

    return `https://${GITHUB_ORG}.github.io/${repoName}/`;
  } catch (error) {
    console.error('GitHub operation failed:', error);
    if (error.status === 403) {
      throw new Error('GitHub API access denied. Please check your GitHub token permissions.');
    } else if (error.status === 404) {
      throw new Error('GitHub organization not found. Please check your GITHUB_ORG setting.');
    } else {
      throw new Error(`GitHub operation failed: ${error.message}`);
    }
  }
}

// --- TELEGRAM BOT INTEGRATION ---
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (TELEGRAM_BOT_TOKEN) {
  const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
  console.log('Telegram bot started!');

  // Command handlers
  bot.onText(/\/start/, async (msg) => {
    try {
      const chatId = msg.chat.id;
      const userId = msg.from.id.toString();
      
      // Initialize user files
      const initialized = initializeUserFiles(userId);
      if (!initialized) {
        await bot.sendMessage(chatId, "Sorry, there was an error initializing your account. Please try again.");
        return;
      }

      await bot.sendMessage(chatId, 
        "Welcome to the Website Builder Bot! 🚀\n\n" +
        "I'll help you create your perfect website. Here's what you can do:\n\n" +
        "• Just chat with me to describe your website\n" +
        "• Use /generate to create your website\n" +
        "• Use /reset to start over\n\n" +
        "Let's begin! Tell me about your website idea..."
      );
    } catch (error) {
      console.error('Error in /start command:', error);
      await bot.sendMessage(msg.chat.id, "Sorry, there was an error processing your request. Please try again.");
    }
  });

  bot.onText(/\/generate/, async (msg) => {
    try {
      const chatId = msg.chat.id;
      const userId = msg.from.id.toString();
      
      await bot.sendMessage(chatId, "Generating your website... This might take a few moments. ⏳");

      const userFiles = getUserFiles(userId);
      const userProfile = JSON.parse(fs.readFileSync(userFiles.profileFile));
      const chatHistory = JSON.parse(fs.readFileSync(userFiles.historyFile));

      // Generate website code
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "system",
          content: `You are a full-stack AI developer. Create a dynamic, multi-page website using only one HTML file, one CSS file, and one JavaScript file. The website must be fully functional and styled using CSS. JavaScript should handle all interactivity and dynamic behavior.

Here is the user's desired website information:
${JSON.stringify(userProfile, null, 2)}
${JSON.stringify(chatHistory, null, 2)}

Your task:
- Create the HTML, CSS, and JS files to reflect the user's website preferences.
- Include all required pages and sections if listed.
- Make the site responsive and visually appealing.
- Use clean and modern design, respecting colorScheme, theme, etc.
- If the user has uploaded images, use them in the website.
- Make sure all paths are relative and work with the user's directory structure.

Respond ONLY in this JSON format:
{
  "html": "string",
  "css": "string",
  "js": "string"
}`
        }]
      });

      const websiteData = JSON.parse(response.choices[0].message.content);

      // Save website files in user's directory
      fs.writeFileSync(path.join(userFiles.websiteDir, "index.html"), websiteData.html);
      fs.writeFileSync(path.join(userFiles.websiteDir, "styles.css"), websiteData.css);
      fs.writeFileSync(path.join(userFiles.websiteDir, "script.js"), websiteData.js);

      // Add to chat history
      chatHistory.push({
        user: "Generated website",
        bot: "Your website has been generated successfully! You can find the files in your user directory."
      });
      fs.writeFileSync(userFiles.historyFile, JSON.stringify(chatHistory, null, 2));

      await bot.sendMessage(chatId, 
        "🎉 Your website has been generated!\n\n" +
        "The website files have been created in your user directory:\n" +
        `• index.html\n` +
        `• styles.css\n` +
        `• script.js\n\n` +
        "Use /preview to deploy and get a live preview of your website!\n" +
        "You can continue chatting with me to make any changes to your website. Just use /generate again when you want to update it!"
      );
    } catch (error) {
      console.error("Generate Error:", error);
      await bot.sendMessage(msg.chat.id, "Sorry, there was an error generating your website. Please try again.");
    }
  });

  bot.onText(/\/preview/, async (msg) => {
    try {
      const chatId = msg.chat.id;
      const userId = msg.from.id.toString();
      
      await bot.sendMessage(chatId, "Preparing to deploy your website... 🚀");

      const userFiles = getUserFiles(userId);
      
      // Check if website files exist
      const requiredFiles = ['index.html', 'styles.css', 'script.js'];
      const missingFiles = requiredFiles.filter(file => 
        !fs.existsSync(path.join(userFiles.websiteDir, file))
      );

      if (missingFiles.length > 0) {
        await bot.sendMessage(chatId, 
          "❌ Website files not found. Please use /generate first to create your website."
        );
        return;
      }

      // Read website files
      const websiteData = {
        html: fs.readFileSync(path.join(userFiles.websiteDir, 'index.html'), 'utf-8'),
        css: fs.readFileSync(path.join(userFiles.websiteDir, 'styles.css'), 'utf-8'),
        js: fs.readFileSync(path.join(userFiles.websiteDir, 'script.js'), 'utf-8')
      };

      // Deploy to GitHub Pages
      try {
        await bot.sendMessage(chatId, "Deploying to GitHub Pages... This might take a minute. ⏳");
        
        const websiteUrl = await createOrUpdateRepo(userId, websiteData);
        
        await bot.sendMessage(chatId, 
          "🎉 Your website is now live!\n\n" +
          "You can preview your website here:\n" +
          `${websiteUrl}\n\n` +
          "The website will be automatically updated whenever you use /generate again.\n" +
          "Note: It may take a few minutes for changes to appear on the live site."
        );
      } catch (deployError) {
        console.error("Deployment Error:", deployError);
        await bot.sendMessage(chatId, 
          "❌ Failed to deploy your website.\n\n" +
          "Error: " + deployError.message + "\n\n" +
          "Please make sure your GitHub token and organization settings are correct."
        );
      }
    } catch (error) {
      console.error("Preview Error:", error);
      await bot.sendMessage(msg.chat.id, "Sorry, there was an error preparing your website preview. Please try again.");
    }
  });

  bot.onText(/\/reset/, async (msg) => {
    try {
      const chatId = msg.chat.id;
      const userId = msg.from.id.toString();
      
      await bot.sendMessage(chatId, "Resetting your data... 🔄");

      const userFiles = getUserFiles(userId);
      
      // Reset user profile to default
      const defaultProfile = {
        websiteType: "",
        targetAudience: "",
        mainGoal: "",
        colorScheme: "",
        theme: "",
        pages: [],
        sections: [],
        features: [],
        content: {},
        designPreferences: {},
        images: [],
        fonts: "",
        contactInfo: {},
        socialLinks: {},
        customScripts: "",
        branding: {},
        updateRequests: [],
        additionalNotes: "",
      };

      // Clear chat history
      fs.writeFileSync(userFiles.historyFile, "[]");
      
      // Reset user profile
      fs.writeFileSync(userFiles.profileFile, JSON.stringify(defaultProfile, null, 2));
      
      // Clear images directory
      if (fs.existsSync(userFiles.imagesDir)) {
        const files = fs.readdirSync(userFiles.imagesDir);
        for (const file of files) {
          fs.unlinkSync(path.join(userFiles.imagesDir, file));
        }
      }
      
      // Clear website directory
      if (fs.existsSync(userFiles.websiteDir)) {
        const files = fs.readdirSync(userFiles.websiteDir);
        for (const file of files) {
          fs.unlinkSync(path.join(userFiles.websiteDir, file));
        }
      }

      await bot.sendMessage(chatId, 
        "✅ All your data has been reset!\n\n" +
        "• Chat history cleared\n" +
        "• User profile reset\n" +
        "• Images removed\n" +
        "• Website files deleted\n\n" +
        "You can start fresh by describing your website idea!"
      );
    } catch (error) {
      console.error("Reset Error:", error);
      await bot.sendMessage(msg.chat.id, "Sorry, there was an error resetting your data. Please try again.");
    }
  });

  // Function to download and save image from Telegram
  async function downloadAndSaveImage(fileId, userId) {
    try {
      const file = await bot.getFile(fileId);
      const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${file.file_path}`;
      
      // Get the file extension from the file path
      const fileExt = path.extname(file.file_path);
      const timestamp = Date.now();
      const filename = `${timestamp}${fileExt}`;
      
      // Get user's images directory
      const userFiles = getUserFiles(userId);
      const imagePath = path.join(userFiles.imagesDir, filename);

      // Download the file
      const response = await axios({
        method: 'GET',
        url: fileUrl,
        responseType: 'stream'
      });

      // Save the file
      const writer = fs.createWriteStream(imagePath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve({
          filename,
          path: imagePath,
          url: `/images/${userId}/${filename}`
        }));
        writer.on('error', reject);
      });
    } catch (error) {
      console.error('Error downloading image:', error);
      throw error;
    }
  }

  // Regular message handler
  bot.on('message', async (msg) => {
    try {
      if (msg.text && msg.text.startsWith('/')) return; // Skip commands

      const chatId = msg.chat.id;
      const userId = msg.from.id.toString();
      // console.log('Message received from user:', userId);

      // Initialize user files if they don't exist
      const initialized = initializeUserFiles(userId);
      if (!initialized) {
        await bot.sendMessage(chatId, "Sorry, there was an error accessing your account. Please try /start again.");
        return;
      }

      const userFiles = getUserFiles(userId);
      const chatHistory = JSON.parse(fs.readFileSync(userFiles.historyFile));
      const userProfile = JSON.parse(fs.readFileSync(userFiles.profileFile));

      // Handle photo message
      if (msg.photo) {
        try {
          // Get the largest photo (best quality)
          const photo = msg.photo[msg.photo.length - 1];
          const imageData = await downloadAndSaveImage(photo.file_id, userId);

          // Call OpenAI to analyze the image
          const analysis = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "You are a helpful assistant that describes images.",
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "What kind of image is this and what is its use?",
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/${path.extname(imageData.filename).slice(1)};base64,${fs.readFileSync(imageData.path, {
                        encoding: "base64",
                      })}`,
                    },
                  },
                ],
              },
            ],
            max_tokens: 200,
          });

          const aiDescription = analysis.choices[0].message.content;

          // Add image to user profile
          if (!userProfile.images) userProfile.images = [];
          const imageInfo = {
            filename: imageData.filename,
            originalname: imageData.filename,
            url: imageData.url,
            uploadedAt: new Date().toISOString(),
            description: msg.caption || "",
            aiAnalysis: aiDescription,
          };
          userProfile.images.push(imageInfo);

          // Add to chat history
          chatHistory.push({
            user: `Uploaded image${msg.caption ? ` with caption: "${msg.caption}"` : ""}`,
            bot: `AI Analysis: ${aiDescription}`,
          });

          // Save updated profile and history
          fs.writeFileSync(userFiles.profileFile, JSON.stringify(userProfile, null, 2));
          fs.writeFileSync(userFiles.historyFile, JSON.stringify(chatHistory, null, 2));

          await bot.sendMessage(chatId, `Image received and analyzed! 📸\n\nAI Analysis: ${aiDescription}`);
          return;
        } catch (error) {
          console.error('Error processing image:', error);
          await bot.sendMessage(chatId, "Sorry, there was an error processing your image. Please try again.");
          return;
        }
      }

      // Handle text message
      const message = msg.text;
      const updatedHistory = [...chatHistory, { user: message, bot: '' }];

      const formattedConversation = updatedHistory
        .map((entry) =>
          entry.user && entry.bot
            ? `User: ${entry.user}\nBot: ${entry.bot}`
            : `User: ${entry.user}`
        )
        .join("\n");

      const promptQuick = generateChatPrompt(formattedConversation, userProfile);

      const quickResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: promptQuick }],
      });

      let responseText = quickResponse.choices[0].message.content;
      responseText = responseText.replace(/```json|```/g, "").trim();

      let parsedQuick;
      try {
        parsedQuick = JSON.parse(responseText);
      } catch (err) {
        console.error("❌ Failed to parse JSON from OpenAI:", responseText);
        await bot.sendMessage(chatId, "Sorry, there was an error understanding the response. Please try again.");
        return;
      }

      updatedHistory[updatedHistory.length - 1].bot = parsedQuick.nextQuestion;
      fs.writeFileSync(userFiles.historyFile, JSON.stringify(updatedHistory, null, 2));
      fs.writeFileSync(userFiles.profileFile, JSON.stringify(parsedQuick.updatedUserProfile, null, 2));

      await bot.sendMessage(chatId, parsedQuick.nextQuestion);
    } catch (error) {
      console.error('Error in message handler:', error);
      await bot.sendMessage(msg.chat.id, "Sorry, there was an error processing your message. Please try again.");
    }
  });
} else {
  console.log('TELEGRAM_BOT_TOKEN not set. Telegram bot not started.');
}

// Start server
const port = process.env.PORT || 3001;
app.listen(port, () =>
  console.log(`Server running on http://localhost:${port}`)
);
