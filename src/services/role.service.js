const { roleMap, miniSocRole } = require('../config/roles');
const logger = require('../utils/logger');

/**
 * Find role in guild by ID or fallback by Name
 */
function findRole(guild, roleConfig) {
  if (!roleConfig) return null;
  if (roleConfig.id) {
    const role = guild.roles.cache.get(roleConfig.id);
    if (role) return role;
  }
  return guild.roles.cache.find(r => r.name === roleConfig.name);
}

/**
 * Remove all onboarding roles from member
 */
async function removeAllOnboardingRoles(member) {
  const guild = member.guild;
  const artistRole = findRole(guild, roleMap.artist);
  const musicRole = findRole(guild, roleMap.music);
  const batTaiRole = findRole(guild, roleMap.batTai);
  const miniSocRoleObj = findRole(guild, miniSocRole);

  if (artistRole && member.roles.cache.has(artistRole.id)) await member.roles.remove(artistRole);
  if (musicRole && member.roles.cache.has(musicRole.id)) await member.roles.remove(musicRole);
  if (batTaiRole && member.roles.cache.has(batTaiRole.id)) await member.roles.remove(batTaiRole);
  if (miniSocRoleObj && member.roles.cache.has(miniSocRoleObj.id)) await member.roles.remove(miniSocRoleObj);
}

/**
 * Handle role updates for Onboarding:
 * - Members can choose 1, 2, or all 3 roles freely without restrictions.
 * - ROLE_MINI_SOC is automatically assigned when at least one onboarding role is chosen.
 */
async function updateOnboardingRoles(member, selectedValues) {
  const guild = member.guild;

  const artistRole = findRole(guild, roleMap.artist);
  const musicRole = findRole(guild, roleMap.music);
  const batTaiRole = findRole(guild, roleMap.batTai);
  const miniSocRoleObj = findRole(guild, miniSocRole);

  const values = Array.isArray(selectedValues) ? selectedValues : [selectedValues];

  if (values.includes('reset')) {
    await removeAllOnboardingRoles(member);
    return;
  }

  const wantArtist = values.includes('artist');
  const wantMusic = values.includes('music');
  const wantBatTai = values.includes('bat_tai');

  // Update artist role
  if (artistRole) {
    if (wantArtist && !member.roles.cache.has(artistRole.id)) {
      await member.roles.add(artistRole);
      logger.info(`Added role '${artistRole.name}' to ${member.user.tag}`);
    } else if (!wantArtist && member.roles.cache.has(artistRole.id)) {
      await member.roles.remove(artistRole);
      logger.info(`Removed role '${artistRole.name}' from ${member.user.tag}`);
    }
  }

  // Update music role
  if (musicRole) {
    if (wantMusic && !member.roles.cache.has(musicRole.id)) {
      await member.roles.add(musicRole);
      logger.info(`Added role '${musicRole.name}' to ${member.user.tag}`);
    } else if (!wantMusic && member.roles.cache.has(musicRole.id)) {
      await member.roles.remove(musicRole);
      logger.info(`Removed role '${musicRole.name}' from ${member.user.tag}`);
    }
  }

  // Update bat_tai role
  if (batTaiRole) {
    if (wantBatTai && !member.roles.cache.has(batTaiRole.id)) {
      await member.roles.add(batTaiRole);
      logger.info(`Added role '${batTaiRole.name}' to ${member.user.tag}`);
    } else if (!wantBatTai && member.roles.cache.has(batTaiRole.id)) {
      await member.roles.remove(batTaiRole);
      logger.info(`Removed role '${batTaiRole.name}' from ${member.user.tag}`);
    }
  }

  await member.fetch(true);

  const hasAnyRole =
    (artistRole && member.roles.cache.has(artistRole.id)) ||
    (musicRole && member.roles.cache.has(musicRole.id)) ||
    (batTaiRole && member.roles.cache.has(batTaiRole.id));

  // Auto-assign ROLE_MINI_SOC if member has at least one onboarding role
  if (hasAnyRole && miniSocRoleObj && !member.roles.cache.has(miniSocRoleObj.id)) {
    await member.roles.add(miniSocRoleObj);
    logger.info(`Auto-assigned ROLE_MINI_SOC ('${miniSocRoleObj.name}') to ${member.user.tag}`);
  } else if (!hasAnyRole && miniSocRoleObj && member.roles.cache.has(miniSocRoleObj.id)) {
    await member.roles.remove(miniSocRoleObj);
  }
}

/**
 * Get current onboarding selection status for a member
 */
function getMemberRoleStatus(member) {
  const guild = member.guild;
  const artistRole = findRole(guild, roleMap.artist);
  const musicRole = findRole(guild, roleMap.music);
  const batTaiRole = findRole(guild, roleMap.batTai);

  return {
    hasArtist: artistRole ? member.roles.cache.has(artistRole.id) : false,
    hasMusic: musicRole ? member.roles.cache.has(musicRole.id) : false,
    hasBatTai: batTaiRole ? member.roles.cache.has(batTaiRole.id) : false,
  };
}

module.exports = {
  updateOnboardingRoles,
  getMemberRoleStatus,
  findRole,
};
