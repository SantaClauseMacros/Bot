const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  EmbedBuilder,
  ChannelType,
  ActivityType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
require("dotenv").config();

// Create a new client with all necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.DirectMessageTyping,
    GatewayIntentBits.MessageContent,
  ],
  partials: [
    Partials.User,
    Partials.Channel,
    Partials.GuildMember,
    Partials.Message,
    Partials.Reaction,
    Partials.GuildScheduledEvent,
    Partials.ThreadMember,
  ],
});

// Command prefix
const prefix = "!";

// Bot is ready
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Set bot status
  client.user.setPresence({
    activities: [{ name: `your clan server`, type: ActivityType.Watching }],
    status: "online",
  });

  console.log("Bot is ready and online!");

  // Set interval to update member count channels every 10 minutes
  setInterval(
    () => {
      updateMemberCountChannels();
    },
    10 * 60 * 1000,
  ); // 10 minutes in milliseconds

  // Initial update
  updateMemberCountChannels();
});

// Function to update member count channels
async function updateMemberCountChannels() {
  client.guilds.cache.forEach(async (guild) => {
    try {
      // Get member counts
      const totalMembers = guild.memberCount;
      const humanMembers = guild.members.cache.filter(
        (member) => !member.user.bot,
      ).size;
      const botMembers = guild.members.cache.filter(
        (member) => member.user.bot,
      ).size;

      // Find and update the channels
      const allMembersChannel = guild.channels.cache.find((channel) =>
        channel.name.startsWith("👥┃all-members-"),
      );
      const membersChannel = guild.channels.cache.find((channel) =>
        channel.name.startsWith("👤┃members-"),
      );
      const botsChannel = guild.channels.cache.find((channel) =>
        channel.name.startsWith("🤖┃bots-"),
      );

      if (allMembersChannel) {
        await allMembersChannel.setName(`👥┃all-members-${totalMembers}`);
      }

      if (membersChannel) {
        await membersChannel.setName(`👤┃members-${humanMembers}`);
      }

      if (botsChannel) {
        await botsChannel.setName(`🤖┃bots-${botMembers}`);
      }

      console.log(`Updated member count channels for ${guild.name}`);
    } catch (error) {
      console.error(
        `Error updating member count channels for ${guild.name}:`,
        error,
      );
    }
  });
}

// Welcome new members
client.on("guildMemberAdd", async (member) => {
  try {
    // Find welcome channel
    const welcomeChannel = member.guild.channels.cache.find(
      (channel) => channel.name === "👋┃welcome",
    );

    if (welcomeChannel) {
      const welcomeEmbed = new EmbedBuilder()
        .setColor("#00FF00")
        .setTitle("New Member!")
        .setDescription(
          `Welcome to the server, ${member}! We're glad to have you here.`,
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp()
        .setFooter({
          text: `We now have ${member.guild.memberCount} members!`,
        });

      welcomeChannel.send({ embeds: [welcomeEmbed] });
    }

    // Add member role automatically
    const memberRole = member.guild.roles.cache.find(
      (role) => role.name === "Member",
    );
    if (memberRole) {
      await member.roles.add(memberRole);
    }

    // Add bot role if it's a bot
    if (member.user.bot) {
      const botRole = member.guild.roles.cache.find((role) => role.name === "Bot");
      if (botRole) {
        await member.roles.add(botRole);
      }
    }

    // Update member count channels
    updateMemberCountChannels();
  } catch (error) {
    console.error("Error in welcoming new member:", error);
  }
});

// Member leaves server
client.on("guildMemberRemove", async (member) => {
  // Update member count channels when a member leaves
  updateMemberCountChannels();
});

// Ban counter
let banCount = 0;

// Message handler
client.on("messageDelete", async (message) => {
  const logsChannel = message.guild?.channels.cache.find(
    (channel) => channel.name === "📝┃message-logs",
  );

  if (logsChannel && message.content) {
    const logEmbed = new EmbedBuilder()
      .setColor("#FF0000")
      .setTitle("Message Deleted")
      .setDescription(
        `Message by ${message.author} was deleted in ${message.channel}`,
      )
      .addFields({ name: "Content", value: message.content })
      .setTimestamp();

    await logsChannel.send({ embeds: [logEmbed] });
  }
});

client.on("messageUpdate", async (oldMessage, newMessage) => {
  if (oldMessage.content === newMessage.content) return;

  const logsChannel = oldMessage.guild?.channels.cache.find(
    (channel) => channel.name === "📝┃message-logs",
  );

  if (logsChannel) {
    const logEmbed = new EmbedBuilder()
      .setColor("#FFA500")
      .setTitle("Message Edited")
      .setDescription(
        `Message by ${oldMessage.author} was edited in ${oldMessage.channel}`,
      )
      .addFields(
        { name: "Before", value: oldMessage.content || "No content" },
        { name: "After", value: newMessage.content || "No content" },
      )
      .setTimestamp();

    await logsChannel.send({ embeds: [logEmbed] });
  }
});

client.on("guildMemberUpdate", async (oldMember, newMember) => {
  const logsChannel = oldMember.guild?.channels.cache.find(
    (channel) => channel.name === "📝┃user-logs",
  );

  if (logsChannel) {
    const oldRoles = oldMember.roles.cache.map((role) => role.name).join(", ");
    const newRoles = newMember.roles.cache.map((role) => role.name).join(", ");

    if (oldRoles !== newRoles) {
      const logEmbed = new EmbedBuilder()
        .setColor("#0000FF")
        .setTitle("Member Roles Updated")
        .setDescription(`Roles updated for ${newMember.user.tag}`)
        .addFields(
          { name: "Old Roles", value: oldRoles },
          { name: "New Roles", value: newRoles },
        )
        .setTimestamp();

      await logsChannel.send({ embeds: [logEmbed] });
    }
  }
});

// Message handler
client.on("messageCreate", async (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // Purge command
  if (command === "purge") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#FF0000")
            .setTitle("❌ Permission Denied")
            .setDescription("You need `Manage Messages` permission to use this command.")
        ]
      });
    }

    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 1 || amount > 100) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#FF0000")
            .setTitle("❌ Invalid Amount")
            .setDescription("Please provide a number between 1 and 100.")
        ]
      });
    }

    try {
      const deleted = await message.channel.bulkDelete(amount + 1);
      const embed = new EmbedBuilder()
        .setColor("#00FF00")
        .setTitle("🧹 Messages Purged")
        .setDescription(`Successfully deleted ${deleted.size - 1} messages.`)
        .setFooter({ text: `Requested by ${message.author.tag}` })
        .setTimestamp();

      const reply = await message.channel.send({ embeds: [embed] });
      setTimeout(() => reply.delete(), 5000);
    } catch (error) {
      message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#FF0000")
            .setTitle("❌ Error")
            .setDescription("Can't delete messages older than 14 days.")
        ]
      });
    }
  }

  // Fun commands
  if (command === "ping") {
    const sent = await message.channel.send("Pinging...");
    const ping = sent.createdTimestamp - message.createdTimestamp;
    
    const embed = new EmbedBuilder()
      .setColor("#00FF00")
      .setTitle("🏓 Pong!")
      .addFields(
        { name: "Bot Latency", value: `${ping}ms`, inline: true },
        { name: "API Latency", value: `${Math.round(client.ws.ping)}ms`, inline: true }
      )
      .setTimestamp();
    
    sent.edit({ content: null, embeds: [embed] });
  }

  if (command === "serverinfo") {
    const owner = await message.guild.fetchOwner();
    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle(`${message.guild.name} Server Information`)
      .setThumbnail(message.guild.iconURL({ dynamic: true }))
      .addFields(
        { name: "👑 Owner", value: owner.user.tag, inline: true },
        { name: "📅 Created", value: `<t:${Math.floor(message.guild.createdTimestamp / 1000)}:R>`, inline: true },
        { name: "👥 Members", value: message.guild.memberCount.toString(), inline: true },
        { name: "💬 Channels", value: message.guild.channels.cache.size.toString(), inline: true },
        { name: "🎭 Roles", value: message.guild.roles.cache.size.toString(), inline: true },
        { name: "🌍 Region", value: message.guild.preferredLocale, inline: true }
      )
      .setFooter({ text: `Server ID: ${message.guild.id}` })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }

  if (command === "userinfo") {
    const target = message.mentions.members.first() || message.member;
    const roles = target.roles.cache
      .filter(role => role.id !== message.guild.id)
      .map(role => role.toString())
      .join(", ") || "None";

    const embed = new EmbedBuilder()
      .setColor(target.displayHexColor)
      .setTitle(`${target.user.tag}'s Information`)
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "🆔 ID", value: target.user.id, inline: true },
        { name: "📅 Joined Server", value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>`, inline: true },
        { name: "📝 Account Created", value: `<t:${Math.floor(target.user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: "👑 Highest Role", value: target.roles.highest.toString(), inline: true },
        { name: "🎭 Roles", value: roles }
      )
      .setFooter({ text: `Requested by ${message.author.tag}` })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }

  // Setup command
  if (command === "setup") {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return message.reply(
        "You need administrator permissions to use this command!",
      );
    }

    const setupEmbed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle("Server Setup Started")
      .setDescription(
        "Deleting existing channels and setting up new ones, please wait...",
      )
      .setTimestamp();

    const setupMsg = await message.channel.send({ embeds: [setupEmbed] });

    try {
      // Delete all existing channels and categories
      await deleteAllChannels(message.guild);

      // Create a temporary channel to continue the setup
      const tempCategory = await message.guild.channels.create({
        name: "SETUP IN PROGRESS",
        type: ChannelType.GuildCategory,
        reason: "Temporary category for setup",
      });

      const tempChannel = await message.guild.channels.create({
        name: "setup-in-progress",
        type: ChannelType.GuildText,
        parent: tempCategory,
        reason: "Temporary channel for setup",
      });

      // Update status message
      const deletionCompleteEmbed = new EmbedBuilder()
        .setColor("#FFA500")
        .setTitle("Channels Deleted")
        .setDescription(
          "All existing channels have been deleted. Creating new channels and roles...",
        )
        .setTimestamp();

      await tempChannel.send({ embeds: [deletionCompleteEmbed] });

      // Create roles with proper hierarchy and permissions
      const roles = {
        owner: await createRole(message.guild, "Owner", "#FF0000", "HIGHEST", [
          "Administrator",
        ]),
        admin: await createRole(message.guild, "Admin", "#FFA500", "HIGH", [
          "ManageGuild",
          "ManageRoles",
          "ManageChannels",
          "KickMembers",
          "BanMembers",
          "ManageMessages",
          "MentionEveryone",
          "ManageNicknames",
          "ManageWebhooks",
          "ViewAuditLog",
          "MuteMembers",
          "DeafenMembers",
          "MoveMembers",
        ]),
        moderator: await createRole(
          message.guild,
          "Moderator",
          "#FFFF00",
          "MEDIUM",
          [
            "KickMembers",
            "ManageMessages",
            "ViewAuditLog",
            "MuteMembers",
            "ManageNicknames",
            "ChangeNickname",
          ],
        ),
        clanOfficer: await createRole(
          message.guild,
          "Clan Officer",
          "#00FF00",
          "STANDARD",
          ["ManageMessages", "MuteMembers", "ChangeNickname", "ManageEvents"],
        ),
        clanMember: await createRole(
          message.guild,
          "Clan Member",
          "#00FFFF",
          "LOW",
          ["ChangeNickname", "AddReactions", "Stream", "UseEmbeddedActivities"],
        ),
        member: await createRole(message.guild, "Member", "#0000FF", "LOWEST", [
          "SendMessages",
          "ViewChannel",
          "ReadMessageHistory",
          "Connect",
          "Speak",
        ]),
        announcements: await createRole(
          message.guild,
          "Announcement Ping",
          "#FF69B4",
          "LOWEST",
          [],
        ),
        giveaways: await createRole(
          message.guild,
          "Giveaway Ping",
          "#9932CC",
          "LOWEST",
          [],
        ),
        bot: await createRole(message.guild, "Bot", "#7289DA", "HIGHEST_BOT", [
          "Administrator",
        ]),
      };

      // Create channel categories and channels
      await createChannelStructure(message.guild, roles);

      // Delete temporary category and channel
      await tempCategory.delete("Setup completed");

      // Find the newly created announcements channel
      const announcementsChannel = message.guild.channels.cache.find(
        (channel) => channel.name === "📢┃announcements",
      );

      if (announcementsChannel) {
        // Update setup status
        const completedEmbed = new EmbedBuilder()
          .setColor("#00FF00")
          .setTitle("Server Setup Complete")
          .setDescription(
            "All channels and roles have been created successfully!",
          )
          .addFields(
            {
              name: "Roles Created",
              value: Object.keys(roles).length.toString(),
              inline: true,
            },
            { name: "Categories Created", value: "6", inline: true },
          )
          .setTimestamp();

        await announcementsChannel.send({ embeds: [completedEmbed] });

        // Send server info to announcements channel
        const serverInfoEmbed = new EmbedBuilder()
          .setColor("#0099ff")
          .setTitle("Server Setup Complete!")
          .setDescription(
            "Welcome to your new server! Here's some information to get you started:",
          )
          .addFields(
            {
              name: "👋 Roles",
              value:
                "Go to <#" +
                message.guild.channels.cache.find(
                  (channel) => channel.name === "👋┃roles",
                ).id +
                "> to get your notification roles",
            },
            {
              name: "📖 Rules",
              value:
                "Check <#" +
                message.guild.channels.cache.find(
                  (channel) => channel.name === "📖┃rules",
                ).id +
                "> for server rules",
            },
            {
              name: "⚡ Join Clan",
              value:
                "Go to <#" +
                message.guild.channels.cache.find(
                  (channel) => channel.name === "⚡┃join-clan",
                ).id +
                "> to apply for the clan",
            },
            {
              name: "📩 Support",
              value:
                "Need help? Open a ticket in <#" +
                message.guild.channels.cache.find(
                  (channel) => channel.name === "📩┃support-ticket",
                ).id +
                ">",
            },
          )
          .setTimestamp();

        await announcementsChannel.send({ embeds: [serverInfoEmbed] });

        // Set up roles channel with reaction roles
        setupRolesChannel(message.guild, roles);
      }
    } catch (error) {
      console.error("Error setting up server:", error);
      // Try to send error message to any available channel
      const anyChannel = message.guild.channels.cache.find(
        (channel) =>
          channel.type === ChannelType.GuildText &&
          channel.permissionsFor(client.user).has("SendMessages"),
      );

      if (anyChannel) {
        anyChannel.send(
          "An error occurred while setting up the server. Please check the console for details.",
        );
      }
    }
  }

  // Add member to clan command
  if (command === "addclan") {
    // Check if user has permission
    if (
      !message.member.roles.cache.some((r) =>
        ["Owner", "Admin", "Moderator", "Clan Officer"].includes(r.name),
      )
    ) {
      return message.reply("You don't have permission to use this command.");
    }

    const member = message.mentions.members.first();
    if (!member)
      return message.reply("Please mention a member to add to the clan.");

    const clanRole = message.guild.roles.cache.find(
      (role) => role.name === "Clan Member",
    );
    if (!clanRole) return message.reply("Clan Member role not found.");

    try {
      await member.roles.add(clanRole);
      message.channel.send(`${member} has been added to the clan!`);
    } catch (error) {
      console.error("Error adding member to clan:", error);
      message.reply("Failed to add member to clan.");
    }
  }

  // Remove member from clan command
  if (command === "removeclan") {
    // Check if user has permission
    if (
      !message.member.roles.cache.some((r) =>
        ["Owner", "Admin", "Moderator", "Clan Officer"].includes(r.name),
      )
    ) {
      return message.reply("You don't have permission to use this command.");
    }

    const member = message.mentions.members.first();
    if (!member)
      return message.reply("Please mention a member to remove from the clan.");

    const clanRole = message.guild.roles.cache.find(
      (role) => role.name === "Clan Member",
    );
    if (!clanRole) return message.reply("Clan Member role not found.");

    try {
      await member.roles.remove(clanRole);
      message.channel.send(`${member} has been removed from the clan.`);
    } catch (error) {
      console.error("Error removing member from clan:", error);
      message.reply("Failed to remove member from clan.");
    }
  }

  // Help command - restricted to bot commands channel or staff
  if (command === "help") {
    // Check if channel is bot-commands or user has permission
    const isBotCommandsChannel = message.channel.name === "🤖┃bot-commands";
    const hasPermission = message.member.roles.cache.some((r) =>
      ["Owner", "Admin", "Moderator", "Clan Officer"].includes(r.name),
    );

    if (!isBotCommandsChannel && !hasPermission) {
      return message.reply(
        "This command can only be used in the bot-commands channel or by staff members.",
      );
    }

    const helpEmbed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle("Bot Commands")
      .setDescription("Here are the available commands:")
      .addFields(
        {
          name: "🛠️ Admin Commands",
          value: `
!setup - Set up server channels and roles (Admin only)
!promote @user role - Promote a user to a role (Admin+)
!purge <number> - Delete messages (Staff+)
!logs - Set up logging channels (Admin only)
!botsetup - Set up bot roles (Admin only)
!staff - Create staff channels (Admin only)
!editpanel "Title" Description - Edit ticket panel (Admin only)`,
          inline: false
        },
        {
          name: "👥 Clan Management",
          value: `
!addclan @user - Add user to clan (Officers+)
!removeclan @user - Remove user from clan (Officers+)`,
          inline: false
        },
        {
          name: "🔨 Moderation",
          value: `
!kick @user [reason] - Kick a member (Staff+)
!ban @user [reason] - Ban a member (Staff+)`,
          inline: false
        },
        {
          name: "ℹ️ Information",
          value: `
!serverinfo - Show server information
!userinfo [@user] - Show user information
!ping - Check bot latency
!rules - Display server rules
!help - Show this message`,
          inline: false
        }
      )
      .setThumbnail(client.user.displayAvatarURL())
      .setFooter({ text: "Tip: All commands start with !" })
      .setTimestamp();

    message.channel.send({ embeds: [helpEmbed] });
  }

  // Rules command
  if (command === "rules") {
    const rulesEmbed = new EmbedBuilder()
      .setColor("#ff9900")
      .setTitle("Server Rules")
      .setDescription("Please follow these rules to keep our server friendly:")
      .addFields(
        {
          name: "1. Be Respectful",
          value:
            "Treat all members with respect. No harassment, hate speech, or bullying.",
        },
        {
          name: "2. No Spamming",
          value: "Don't spam messages, emotes, or mentions.",
        },
        {
          name: "3. Use Appropriate Channels",
          value: "Post content in the relevant channels.",
        },
        {
          name: "4. No NSFW Content",
          value: "Keep all content PG and appropriate.",
        },
        {
          name: "5. Follow Discord TOS",
          value: "Adhere to Discord's Terms of Service.",
        },
        {
          name: "6. Listen to Staff",
          value: "Follow instructions from server staff.",
        },
      )
      .setTimestamp();

    message.channel.send({ embeds: [rulesEmbed] });
  }

  // Kick command
  if (command === "kick") {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.KickMembers)
    ) {
      return message.reply("You don't have permission to kick members.");
    }

    const member = message.mentions.members.first();
    if (!member) return message.reply("Please mention a member to kick.");

    const reason = args.slice(1).join(" ") || "No reason provided";

    try {
      await member.kick(reason);
      message.channel.send(`Kicked ${member.user.tag} | Reason: ${reason}`);

      // Log the kick
      const logsChannel = message.guild?.channels.cache.find(
        (channel) => channel.name === "📝┃user-logs",
      );
      if (logsChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor("#FF0000")
          .setTitle("Member Kicked")
          .setDescription(
            `${member.user.tag} was kicked by ${message.author.tag}`,
          )
          .addFields({ name: "Reason", value: reason })
          .setTimestamp();
        await logsChannel.send({ embeds: [logEmbed] });
      }
    } catch (error) {
      message.reply("Failed to kick member.");
    }
  }

  // Ban command
  if (command === "ban") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return message.reply("You don't have permission to ban members.");
    }

    const member = message.mentions.members.first();
    if (!member) return message.reply("Please mention a member to ban.");

    const reason = args.slice(1).join(" ") || "No reason provided";
    banCount++;

    try {
      await member.ban({ reason });
      message.channel.send(
        `Banned ${member.user.tag} | Ban #${banCount} | Reason: ${reason}`,
      );

      // Log the ban
      const logsChannel = message.guild?.channels.cache.find(
        (channel) => channel.name === "📝┃user-logs",
      );
      if (logsChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor("#FF0000")
          .setTitle(`Member Banned (#${banCount})`)
          .setDescription(
            `${member.user.tag} was banned by ${message.author.tag}`,
          )
          .addFields({ name: "Reason", value: reason })
          .setTimestamp();
        await logsChannel.send({ embeds: [logEmbed] });
      }
    } catch (error) {
      message.reply("Failed to ban member.");
    }
  }

  // Logs setup command
  if (command === "logs") {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return message.reply(
        "You need administrator permissions to use this command!",
      );
    }

    try {
      // Create logs category
      const logsCategory = await message.guild.channels.create({
        name: "📝 LOGS 📝",
        type: ChannelType.GuildCategory,
      });

      // Create logs channels
      const channels = [
        {
          name: "📝┃user-logs",
          description: "Logs for user joins, leaves, and role updates",
        },
        {
          name: "📝┃message-logs",
          description: "Logs for message edits and deletions",
        },
      ];

      for (const channel of channels) {
        await message.guild.channels.create({
          name: channel.name,
          type: ChannelType.GuildText,
          parent: logsCategory,
          permissionOverwrites: [
            {
              id: message.guild.roles.everyone,
              deny: [PermissionsBitField.Flags.ViewChannel],
            },
            {
              id: message.guild.roles.cache.find((r) => r.name === "Owner")?.id,
              allow: [PermissionsBitField.Flags.ViewChannel],
            },
            {
              id: message.guild.roles.cache.find((r) => r.name === "Admin")?.id,
              allow: [PermissionsBitField.Flags.ViewChannel],
            },
            {
              id: message.guild.roles.cache.find((r) => r.name === "Moderator")
                ?.id,
              allow: [PermissionsBitField.Flags.ViewChannel],
            },
          ],
        });
      }

      message.channel.send("✅ Log channels have been created successfully!");
    } catch (error) {
      console.error("Error creating log channels:", error);
      message.channel.send("❌ An error occurred while creating log channels.");
    }
  }

  // Bot role setup command
  if (command === "botsetup") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("You need administrator permissions to use this command!");
    }

    try {
      // Create or find Bot role
      let botRole = message.guild.roles.cache.find(role => role.name === "Bot");
      if (!botRole) {
        botRole = await createRole(message.guild, "Bot", "#7289DA", "HIGHEST_BOT", ["Administrator"]);
      }

      // Find all bots in the server
      const bots = message.guild.members.cache.filter(member => member.user.bot);
      let assignedCount = 0;

      // Assign role to all bots
      for (const [, botMember] of bots) {
        if (!botMember.roles.cache.has(botRole.id)) {
          await botMember.roles.add(botRole);
          assignedCount++;
        }
      }

      message.channel.send(`✅ Bot role setup complete!\nAssigned role to ${assignedCount} bot(s)`);
    } catch (error) {
      console.error("Error setting up bot role:", error);
      message.channel.send("❌ An error occurred while setting up the bot role.");
    }
  }

  // Staff channels setup command
  if (command === "editpanel") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("You need administrator permissions to use this command!");
    }

    // Find where the description starts (after the title)
    const titleEndIndex = message.content.indexOf('"');
    const titleEndIndex2 = message.content.indexOf('"', titleEndIndex + 1);
    
    if (titleEndIndex === -1 || titleEndIndex2 === -1) {
      return message.reply('Usage: !editpanel "Title Here" Description here');
    }

    const title = message.content.substring(titleEndIndex + 1, titleEndIndex2);
    const description = message.content.slice(titleEndIndex2 + 1).trim();

    if (!description) {
      return message.reply('Please provide both a title and description');
    }

    const panelEmbed = new EmbedBuilder()
      .setColor("#00ff00")
      .setTitle(title)
      .setDescription(description)
      .addFields(
        { name: "Response Time", value: "Usually within 24 hours", inline: true },
        { name: "Support Hours", value: "24/7", inline: true }
      )
      .setFooter({ text: "Your ticket will be handled by our support team" })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("create_ticket")
        .setLabel("Open Support Ticket")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🎫")
    );

    message.channel.send({ embeds: [panelEmbed], components: [row] });
  }

  if (command === "staff") {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return message.reply(
        "You need administrator permissions to use this command!",
      );
    }

    try {
      // Create staff category
      const staffCategory = await message.guild.channels.create({
        name: "👮 STAFF ONLY 👮",
        type: ChannelType.GuildCategory,
      });

      // Set staff category permissions
      await staffCategory.permissionOverwrites.set([
        {
          id: message.guild.roles.everyone,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: message.guild.roles.cache.find((r) => r.name === "Owner")?.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ManageChannels,
          ],
        },
        {
          id: message.guild.roles.cache.find((r) => r.name === "Admin")?.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
          ],
        },
        {
          id: message.guild.roles.cache.find((r) => r.name === "Moderator")?.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
          ],
        },
      ]);

      // Create staff channels
      const staffChannels = [
        { name: "📢┃staff-announcements", type: ChannelType.GuildText },
        { name: "💬┃staff-chat", type: ChannelType.GuildText },
        { name: "📝┃staff-notes", type: ChannelType.GuildText },
        { name: "🔊┃staff-voice", type: ChannelType.GuildVoice },
      ];

      for (const channel of staffChannels) {
        await message.guild.channels.create({
          name: channel.name,
          type: channel.type,
          parent: staffCategory,
        });
      }

      message.channel.send("✅ Staff channels have been created successfully!");
    } catch (error) {
      console.error("Error creating staff channels:", error);
      message.channel.send(
        "❌ An error occurred while creating staff channels.",
      );
    }
  }

  // Promote user command
  if (command === "promote") {
    // Check permissions
    if (
      !message.member.roles.cache.some((r) =>
        ["Owner", "Admin"].includes(r.name),
      )
    ) {
      return message.reply("You don't have permission to use this command.");
    }

    const member = message.mentions.members.first();
    if (!member) return message.reply("Please mention a member to promote.");

    const roleName = args.join(" ");
    if (!roleName) return message.reply("Please specify a role name.");

    const role = message.guild.roles.cache.find(
      (r) => r.name.toLowerCase() === roleName.toLowerCase(),
    );
    if (!role) return message.reply(`Role "${roleName}" not found.`);

    try {
      await member.roles.add(role);
      message.channel.send(`${member} has been promoted to ${role.name}!`);
    } catch (error) {
      console.error("Error promoting member:", error);
      message.reply("Failed to promote member.");
    }
  }
});

// Function to set up roles channel
async function setupRolesChannel(guild, roles) {
  const rolesChannel = guild.channels.cache.find(
    (channel) => channel.name === "👋┃roles",
  );

  if (!rolesChannel) return;

  try {
    const rolesEmbed = new EmbedBuilder()
      .setColor("#9C59B6")
      .setTitle("🔔 Server Notification Roles")
      .setDescription("React to this message to get notification roles:")
      .addFields(
        {
          name: "📢 Announcement Ping",
          value: "Get notified for important server announcements",
          inline: false,
        },
        {
          name: "🎁 Giveaway Ping",
          value: "Get notified when we host giveaways",
          inline: false,
        },
      )
      .setFooter({ text: "Click the buttons below to add or remove roles" });

    // Create buttons for roles
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("role-announcement")
        .setLabel("📢 Announcements")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("role-giveaway")
        .setLabel("🎁 Giveaways")
        .setStyle(ButtonStyle.Success),
    );

    await rolesChannel.send({ embeds: [rolesEmbed], components: [row] });
  } catch (error) {
    console.error("Error setting up roles channel:", error);
  }
}

// Button interaction handler
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  // Handle role buttons
  if (interaction.customId.startsWith("role-")) {
    const roleName =
      interaction.customId === "role-announcement"
        ? "Announcement Ping"
        : "Giveaway Ping";

    const role = interaction.guild.roles.cache.find((r) => r.name === roleName);

    if (!role) {
      return interaction.reply({
        content: "Role not found. Please contact an administrator.",
        ephemeral: true,
      });
    }

    try {
      // Check if user already has the role
      if (interaction.member.roles.cache.has(role.id)) {
        // Remove the role
        await interaction.member.roles.remove(role);
        await interaction.reply({
          content: `You no longer have the ${roleName} role.`,
          ephemeral: true,
        });
      } else {
        // Add the role
        await interaction.member.roles.add(role);
        await interaction.reply({
          content: `You now have the ${roleName} role!`,
          ephemeral: true,
        });
      }
    } catch (error) {
      console.error(`Error toggling role ${roleName}:`, error);
      await interaction.reply({
        content: "An error occurred while updating your roles.",
        ephemeral: true,
      });
    }
  }
});

// Function to delete all channels and categories
async function deleteAllChannels(guild) {
  // Get all channels
  const allChannels = guild.channels.cache;

  // Delete all channels first (except categories)
  const deletePromises = [];
  allChannels.forEach((channel) => {
    if (channel.type !== ChannelType.GuildCategory) {
      deletePromises.push(
        channel.delete("Server setup - clearing all channels"),
      );
    }
  });

  // Wait for all channel deletions
  await Promise.all(deletePromises);

  // Now delete all categories
  const categoryPromises = [];
  guild.channels.cache.forEach((channel) => {
    if (channel.type === ChannelType.GuildCategory) {
      categoryPromises.push(
        channel.delete("Server setup - clearing all categories"),
      );
    }
  });

  // Wait for all category deletions
  await Promise.all(categoryPromises);
}

// Create a role with specific permissions
async function createRole(
  guild,
  name,
  color,
  position = "STANDARD",
  permissions = [],
) {
  const existingRole = guild.roles.cache.find((role) => role.name === name);
  if (existingRole) return existingRole;

  // Convert position string to number
  let positionValue;
  switch (position) {
    case "HIGHEST":
      positionValue = 1;
      break;
    case "HIGH":
      positionValue = 2;
      break;
    case "MEDIUM":
      positionValue = 3;
      break;
    case "STANDARD":
      positionValue = 4;
      break;
    case "LOW":
      positionValue = 5;
      break;
    case "LOWEST":
      positionValue = 6;
      break;
    case "HIGHEST_BOT":
      positionValue = 0; // Position above all other roles
      break;
    default:
      positionValue = 5;
  }

  // Convert permission strings to BigInt flags
  const permissionFlags = permissions.reduce((acc, perm) => {
    if (PermissionsBitField.Flags[perm]) {
      return acc | PermissionsBitField.Flags[perm];
    }
    return acc;
  }, 0n);

  return await guild.roles.create({
    name,
    color,
    position: positionValue,
    permissions: permissionFlags,
    reason: "Server setup",
    hoist: true, // Display members separately in the member list
    mentionable: true, // Allow this role to be mentioned
  });
}

async function createChannelStructure(guild, roles) {
  //  // Define channel categories and their channels
  const categories = [
    {
      name: "🏆 CLAN ZONE 🏆",
      channels: [
        { name: "💬┃clan-chat", type: ChannelType.GuildText },
        { name: "🎁┃clan-giveaways", type: ChannelType.GuildText },
        { name: "📝┃clan-vouches", type: ChannelType.GuildText },
        { name: "📜┃clan-rules", type: ChannelType.GuildText },
        { name: "🔍┃clan-logs", type: ChannelType.GuildText },
        { name: "⚔️┃clan-wars", type: ChannelType.GuildText },
        { name: "🔒┃clan-private", type: ChannelType.GuildText },
        { name: "🔊┃clan-voice", type: ChannelType.GuildVoice },
      ],
      permissions: [
        {
          role: roles.owner,
          allow: [
            "ViewChannel",
            "SendMessages",
            "ManageChannels",
            "ManageMessages",
          ],
        },
        {
          role: roles.admin,
          allow: ["ViewChannel", "SendMessages", "ManageMessages"],
        },
        { role: roles.moderator, allow: ["ViewChannel", "SendMessages"] },
        { role: roles.clanOfficer, allow: ["ViewChannel", "SendMessages"] },
        { role: roles.clanMember, allow: ["ViewChannel", "SendMessages"] },
        { role: roles.member, deny: ["ViewChannel"] },
      ],
    },
    {
      name: "🎁 SERVER STATS 🎁",
      channels: [
        { name: "👥┃all-members-0", type: ChannelType.GuildText },
        { name: "👤┃members-0", type: ChannelType.GuildText },
        { name: "🤖┃bots-0", type: ChannelType.GuildText },
      ],
      permissions: [
        {
          role: guild.roles.everyone,
          allow: ["ViewChannel"],
          deny: ["SendMessages"],
        },
        {
          role: roles.owner,
          allow: ["ViewChannel", "ManageChannels", "SendMessages"],
        },
        { role: roles.admin, allow: ["ViewChannel", "SendMessages"] },
      ],
    },
    {
      name: "📜 IMPORTANT 📜",
      channels: [
        { name: "📢┃announcements", type: ChannelType.GuildText },
        { name: "👋┃welcome", type: ChannelType.GuildText },
        { name: "📖┃rules", type: ChannelType.GuildText },
        { name: "⚡┃join-clan", type: ChannelType.GuildText },
        { name: "🔒┃private-server", type: ChannelType.GuildText },
        { name: "👋┃roles", type: ChannelType.GuildText }, // Renamed from verify to roles
      ],
      permissions: [
        {
          role: guild.roles.everyone,
          allow: ["ViewChannel"],
          deny: ["SendMessages"],
        },
        {
          role: roles.owner,
          allow: [
            "ViewChannel",
            "SendMessages",
            "ManageChannels",
            "ManageMessages",
          ],
        },
        {
          role: roles.admin,
          allow: ["ViewChannel", "SendMessages", "ManageMessages"],
        },
        { role: roles.moderator, allow: ["ViewChannel", "SendMessages"] },
      ],
    },
    {
      name: "🎟️ TICKETS 🎟️",
      channels: [
        { name: "🏅┃claim-prizes", type: ChannelType.GuildText },
        { name: "📩┃support-ticket", type: ChannelType.GuildText },
      ],
      permissions: [
        { role: guild.roles.everyone, allow: ["ViewChannel", "SendMessages"] },
        {
          role: roles.owner,
          allow: [
            "ViewChannel",
            "SendMessages",
            "ManageChannels",
            "ManageMessages",
          ],
        },
        {
          role: roles.admin,
          allow: ["ViewChannel", "SendMessages", "ManageMessages"],
        },
        {
          role: roles.moderator,
          allow: ["ViewChannel", "SendMessages", "ManageMessages"],
        },
      ],
    },
    {
      name: "💬 TEXT CHANNELS 💬",
      channels: [
        { name: "🗨️┃chat", type: ChannelType.GuildText },
        { name: "🤖┃bot-commands", type: ChannelType.GuildText },
        { name: "📷┃media", type: ChannelType.GuildText },
        { name: "💼┃partnerships", type: ChannelType.GuildText },
        { name: "🎮┃gaming", type: ChannelType.GuildText },
      ],
      permissions: [
        {
          role: guild.roles.everyone,
          allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"],
        },
        {
          role: roles.owner,
          allow: [
            "ViewChannel",
            "SendMessages",
            "ManageChannels",
            "ManageMessages",
          ],
        },
        {
          role: roles.admin,
          allow: ["ViewChannel", "SendMessages", "ManageMessages"],
        },
        {
          role: roles.moderator,
          allow: ["ViewChannel", "SendMessages", "ManageMessages"],
        },
      ],
    },
    {
      name: "😎 FUN 😎",
      channels: [
        { name: "🎁┃giveaways", type: ChannelType.GuildText },
        { name: "📜┃giveaway-proof", type: ChannelType.GuildText },
        { name: "🔰┃vouch", type: ChannelType.GuildText },
        { name: "📊┃levels", type: ChannelType.GuildText },
        { name: "🐣┃huge-hatched", type: ChannelType.GuildText },
      ],
      permissions: [
        {
          role: guild.roles.everyone,
          allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"],
        },
        {
          role: roles.owner,
          allow: [
            "ViewChannel",
            "SendMessages",
            "ManageChannels",
            "ManageMessages",
          ],
        },
        {
          role: roles.admin,
          allow: ["ViewChannel", "SendMessages", "ManageMessages"],
        },
        {
          role: roles.moderator,
          allow: ["ViewChannel", "SendMessages", "ManageMessages"],
        },
      ],
    },
    {
      name: "🔊 VOICE CHANNELS 🔊",
      channels: [
        { name: "🎮 Gaming", type: ChannelType.GuildVoice },
        { name: "💬 General", type: ChannelType.GuildVoice },
        { name: "🎵 Music", type: ChannelType.GuildVoice },
        { name: "🎲 AFK", type: ChannelType.GuildVoice },
        { name: "🏆 Clan Wars", type: ChannelType.GuildVoice },
      ],
      permissions: [
        {
          role: guild.roles.everyone,
          allow: ["ViewChannel", "Connect", "Speak"],
        },
        {
          role: roles.owner,
          allow: [
            "ViewChannel",
            "Connect",
            "Speak",
            "ManageChannels",
            "MuteMembers",
            "DeafenMembers",
            "MoveMembers",
          ],
        },
        {
          role: roles.admin,
          allow: [
            "ViewChannel",
            "Connect",
            "Speak",
            "MuteMembers",
            "DeafenMembers",
            "MoveMembers",
          ],
        },
        {
          role: roles.moderator,
          allow: ["ViewChannel", "Connect", "Speak", "MuteMembers"],
        },
      ],
    },
  ];

  // Create all categories and channels
  for (const category of categories) {
    const categoryChannel = await guild.channels.create({
      name: category.name,
      type: ChannelType.GuildCategory,
      reason: "Server setup",
    });

    // Set permissions for the category
    if (category.permissions) {
      for (const perm of category.permissions) {
        if (perm.role) {
          const allowPermissions = convertPermissionsToFlags(perm.allow || []);
          const denyPermissions = convertPermissionsToFlags(perm.deny || []);

          await categoryChannel.permissionOverwrites.create(perm.role, {
            allow: allowPermissions,
            deny: denyPermissions,
          });
        }
      }
    }

    // Create channels for this category
    for (const channel of category.channels) {
      await guild.channels.create({
        name: channel.name,
        type: channel.type,
        parent: categoryChannel,
        reason: "Server setup",
      });
    }
  }
}

// Helper function to convert permission strings to BitField flags
function convertPermissionsToFlags(permissions) {
  return permissions.reduce((acc, perm) => {
    if (PermissionsBitField.Flags[perm]) {
      return acc | PermissionsBitField.Flags[perm];
    }
    return acc;
  }, 0n);
}

// Ticket system
const tickets = new Map();
let ticketCount = 0;

// Handle button interactions for tickets
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "create_ticket") {
    const ticketId = ++ticketCount;
    const channelName = `ticket-${ticketId}`;

    try {
      // Create ticket category if it doesn't exist
      let category = interaction.guild.channels.cache.find(
        (c) => c.name === "🎫 TICKETS 🎫" && c.type === ChannelType.GuildCategory
      );

      if (!category) {
        category = await interaction.guild.channels.create({
          name: "🎫 TICKETS 🎫",
          type: ChannelType.GuildCategory,
        });
      }

      // Create ticket channel
      const ticketChannel = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: category,
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
          },
          {
            id: interaction.guild.roles.cache.find(r => r.name === "Admin")?.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
          },
          {
            id: interaction.guild.roles.cache.find(r => r.name === "Moderator")?.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
          }
        ],
      });

      // Store ticket info
      tickets.set(channelName, {
        userId: interaction.user.id,
        claimed: false,
        claimedBy: null
      });

      // Create ticket control buttons
      const ticketControls = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("claim_ticket")
          .setLabel("Claim Ticket")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("👋"),
        new ButtonBuilder()
          .setCustomId("edit_ticket")
          .setLabel("Edit Content")
          .setStyle(ButtonStyle.Success)
          .setEmoji("📝"),
        new ButtonBuilder()
          .setCustomId("close_ticket")
          .setLabel("Close Ticket")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("🔒"),
        new ButtonBuilder()
          .setCustomId("rename_ticket")
          .setLabel("Rename Ticket")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("✏️")
      );

      const ticketEmbed = new EmbedBuilder()
        .setColor("#00ff00")
        .setTitle(`Ticket #${ticketId}`)
        .setDescription(`Support ticket created by ${interaction.user}`)
        .addFields(
          { name: "Status", value: "Open", inline: true },
          { name: "Created", value: new Date().toLocaleString(), inline: true }
        );

      await ticketChannel.send({ embeds: [ticketEmbed], components: [ticketControls] });
      await interaction.reply({ content: `Ticket created! Check ${ticketChannel}`, ephemeral: true });

    } catch (error) {
      console.error("Error creating ticket:", error);
      await interaction.reply({ content: "Failed to create ticket!", ephemeral: true });
    }
  }

  // Handle ticket claiming
  if (interaction.customId === "claim_ticket") {
    const ticket = tickets.get(interaction.channel.name);
    if (!ticket) return;

    if (ticket.claimed) {
      await interaction.reply({ content: "This ticket is already claimed!", ephemeral: true });
      return;
    }

    if (!interaction.member.roles.cache.some(r => ["Admin", "Moderator"].includes(r.name))) {
      await interaction.reply({ content: "You don't have permission to claim tickets!", ephemeral: true });
      return;
    }

    ticket.claimed = true;
    ticket.claimedBy = interaction.user.id;
    await interaction.reply(`Ticket claimed by ${interaction.user}`);
  }

  // Handle ticket closing
  if (interaction.customId === "close_ticket") {
    const ticket = tickets.get(interaction.channel.name);
    if (!ticket) return;

    const isStaff = interaction.member.roles.cache.some(r => ["Admin", "Moderator"].includes(r.name));
    const isTicketCreator = interaction.user.id === ticket.userId;

    if (!isStaff && !isTicketCreator) {
      await interaction.reply({ content: "You don't have permission to close this ticket!", ephemeral: true });
      return;
    }

    await interaction.reply("Closing ticket in 5 seconds...");
    setTimeout(async () => {
      await interaction.channel.delete();
      tickets.delete(interaction.channel.name);
    }, 5000);
  }

  // Handle ticket editing
  if (interaction.customId === "edit_ticket") {
    const ticket = tickets.get(interaction.channel.name);
    if (!ticket) return;

    if (!interaction.member.roles.cache.some(r => ["Admin", "Moderator"].includes(r.name))) {
      await interaction.reply({ content: "You don't have permission to edit tickets!", ephemeral: true });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId("edit_ticket_modal")
      .setTitle("Edit Ticket");

    const contentInput = new TextInputBuilder()
      .setCustomId("ticket_content")
      .setLabel("Edit Ticket Content")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Enter ticket content")
      .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(contentInput);
    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);
  }

  // Handle ticket renaming
  if (interaction.customId === "rename_ticket") {
    if (!interaction.member.roles.cache.some(r => ["Admin", "Moderator"].includes(r.name))) {
      await interaction.reply({ content: "You don't have permission to rename tickets!", ephemeral: true });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId("rename_ticket_modal")
      .setTitle("Rename Ticket");

    const nameInput = new TextInputBuilder()
      .setCustomId("new_name")
      .setLabel("New Ticket Name")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Enter new ticket name")
      .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(nameInput);
    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);
  }
});

// Handle modal submissions for ticket renaming
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isModalSubmit()) return;

  if (interaction.customId === "edit_ticket_modal") {
    const content = interaction.fields.getTextInputValue("ticket_content");
    try {
      const embed = new EmbedBuilder()
        .setColor("#00ff00")
        .setTitle(interaction.channel.name)
        .setDescription(content)
        .setTimestamp();
      
      await interaction.channel.send({ embeds: [embed] });
      await interaction.reply({ content: "Ticket content updated!", ephemeral: true });
    } catch (error) {
      await interaction.reply({ content: "Failed to edit ticket!", ephemeral: true });
    }
  }

  if (interaction.customId === "rename_ticket_modal") {
    const newName = interaction.fields.getTextInputValue("new_name")
      .toLowerCase()
      .replace(/\s+/g, '-'); // Replace spaces with hyphens
    try {
      await interaction.channel.setName(`ticket-${newName}`);
      await interaction.reply(`Ticket renamed to: ${newName}`);
    } catch (error) {
      await interaction.reply({ content: "Failed to rename ticket!", ephemeral: true });
    }
  }
});

// Login to Discord
client.login(process.env.BOT_TOKEN);
