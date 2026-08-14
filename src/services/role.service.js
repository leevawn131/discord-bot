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
 * Handle role updates for Onboarding with strict mutual exclusivity rules:
 * - If user selected BOTH bat_tai AND (artist || music) -> CONFLICT! Strip all roles and return conflict: true.
 * - If user selected reset -> Strip all roles.
 * - Otherwise -> Assign valid roles & auto-assign ROLE_MINI_SOC.
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
    return { conflict: false };
  }

  const wantArtist = values.includes('artist');
  const wantMusic = values.includes('music');
  const wantBatTai = values.includes('bat_tai');

  // CONFLICT DETECTION: Checked both bat_tai AND a skill role!
  if (wantBatTai && (wantArtist || wantMusic)) {
    logger.warn(`Conflict detected for ${member.user.tag}: checked bat_tai along with skills. Cancelling selection.`);
    await removeAllOnboardingRoles(member);
    return { conflict: true };
  }

  if (wantArtist || wantMusic) {
    if (batTaiRole && member.roles.cache.has(batTaiRole.id)) {
      await member.roles.remove(batTaiRole);
    }

    if (artistRole) {
      if (wantArtist && !member.roles.cache.has(artistRole.id)) {
        await member.roles.add(artistRole);
      } else if (!wantArtist && member.roles.cache.has(artistRole.id)) {
        await member.roles.remove(artistRole);
      }
    }

    if (musicRole) {
      if (wantMusic && !member.roles.cache.has(musicRole.id)) {
        await member.roles.add(musicRole);
      } else if (!wantMusic && member.roles.cache.has(musicRole.id)) {
        await member.roles.remove(musicRole);
      }
    }
  } else if (wantBatTai) {
    if (batTaiRole && !member.roles.cache.has(batTaiRole.id)) {
      await member.roles.add(batTaiRole);
      logger.info(`Added role '${batTaiRole.name}' to ${member.user.tag}`);
    }
    if (artistRole && member.roles.cache.has(artistRole.id)) {
      await member.roles.remove(artistRole);
    }
    if (musicRole && member.roles.cache.has(musicRole.id)) {
      await member.roles.remove(musicRole);
    }
  }

  await member.fetch(true);

  const hasAnyRole =
    (artistRole && member.roles.cache.has(artistRole.id)) ||
    (musicRole && member.roles.cache.has(musicRole.id)) ||
    (batTaiRole && member.roles.cache.has(batTaiRole.id));

  if (hasAnyRole && miniSocRoleObj && !member.roles.cache.has(miniSocRoleObj.id)) {
    await member.roles.add(miniSocRoleObj);
    logger.info(`Auto-assigned ROLE_MINI_SOC ('${miniSocRoleObj.name}') to ${member.user.tag}`);
  }

  return { conflict: false };
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
