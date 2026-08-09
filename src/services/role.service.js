const { roleMap, nsfwRole } = require('../config/roles');
const logger = require('../utils/logger');

/**
 * Find role in guild by ID or fallback by Name
 */
function findRole(guild, roleConfig) {
  if (roleConfig.id) {
    const role = guild.roles.cache.get(roleConfig.id);
    if (role) return role;
  }
  return guild.roles.cache.find(r => r.name === roleConfig.name);
}

/**
 * Handle mutally exclusive role updates for Onboarding
 */
async function updateOnboardingRoles(member, selectedValues) {
  const guild = member.guild;

  // Find target roles to add/remove
  for (const key in roleMap) {
    const roleConfig = roleMap[key];
    const role = findRole(guild, roleConfig);

    if (!role) {
      logger.error(`Role for '${key}' not found in guild '${guild.name}'`);
      continue;
    }

    const shouldHaveRole = selectedValues.includes(key);
    const hasRole = member.roles.cache.has(role.id);

    if (shouldHaveRole && !hasRole) {
      await member.roles.add(role);
      logger.info(`Added role '${role.name}' to user ${member.user.tag}`);
    } else if (!shouldHaveRole && hasRole) {
      await member.roles.remove(role);
      logger.info(`Removed role '${role.name}' from user ${member.user.tag}`);
    }
  }
}

/**
 * Assign NSFW role safely
 */
async function addNSFWRole(member) {
  const guild = member.guild;
  const role = findRole(guild, nsfwRole);

  if (!role) {
    throw new Error(`Role NSFW ('${nsfwRole.name}') không tìm thấy trong server.`);
  }

  if (!member.roles.cache.has(role.id)) {
    await member.roles.add(role);
    logger.info(`Added NSFW role to user ${member.user.tag}`);
  }
}

module.exports = {
  updateOnboardingRoles,
  addNSFWRole,
  findRole,
};
