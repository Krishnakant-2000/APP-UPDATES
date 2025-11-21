/**
 * Privacy utility functions for masking sensitive user information
 */

/**
 * Masks an email address by replacing most characters with asterisks
 * @param email - The email address to mask
 * @returns Masked email in format: a****@e*****.com
 * @example
 * maskEmail("john.doe@example.com") // returns "j******@e******.com"
 */
export const maskEmail = (email: string | undefined): string => {
  if (!email || email === 'Not specified') {
    return 'Not specified';
  }

  try {
    const [localPart, domain] = email.split('@');

    if (!localPart || !domain) {
      return '**********';
    }

    // Show first character of local part, mask the rest
    const maskedLocal = localPart.charAt(0) + '*'.repeat(Math.max(localPart.length - 1, 6));

    // For domain, show first character and extension, mask the middle
    const domainParts = domain.split('.');
    if (domainParts.length < 2) {
      return '**********';
    }

    const domainName = domainParts[0];
    const extension = domainParts.slice(1).join('.');
    const maskedDomain = domainName.charAt(0) + '*'.repeat(Math.max(domainName.length - 1, 5)) + '.' + extension;

    return `${maskedLocal}@${maskedDomain}`;
  } catch (error) {
    console.error('Error masking email:', error);
    return '**********';
  }
};

/**
 * Masks a phone number by replacing most digits with asterisks
 * @param phone - The phone number to mask
 * @returns Masked phone number showing only last 2 digits
 * @example
 * maskPhone("+1234567890") // returns "********90"
 */
export const maskPhone = (phone: string | undefined): string => {
  if (!phone || phone === 'Not specified') {
    return 'Not specified';
  }

  try {
    // Remove all non-digit characters except + at the start
    const cleaned = phone.replace(/[^\d+]/g, '');

    if (cleaned.length < 2) {
      return '**********';
    }

    // Show last 2 digits, mask everything else
    const visiblePart = cleaned.slice(-2);
    const maskedLength = Math.max(cleaned.length - 2, 8);
    const maskedPart = '*'.repeat(maskedLength);

    return maskedPart + visiblePart;
  } catch (error) {
    console.error('Error masking phone:', error);
    return '**********';
  }
};

/**
 * Determines if a user's sensitive information should be masked
 * @param isOwner - Whether the current user is viewing their own profile
 * @param userRole - The role of the profile being viewed
 * @returns true if the information should be masked, false otherwise
 */
export const shouldMaskSensitiveInfo = (
  isOwner: boolean,
  userRole: 'athlete' | 'organization' | 'parents' | 'coaches'
): boolean => {
  // Don't mask if viewing own profile
  if (isOwner) {
    return false;
  }

  // Mask for athlete (player) and parents accounts when viewed by others
  return userRole === 'athlete' || userRole === 'parents';
};

/**
 * Gets the display value for email with privacy masking applied if needed
 * @param email - The email address
 * @param isOwner - Whether the current user owns this profile
 * @param userRole - The role of the profile being viewed
 * @returns The email or masked version based on privacy settings
 */
export const getPrivateEmail = (
  email: string | undefined,
  isOwner: boolean,
  userRole: 'athlete' | 'organization' | 'parents' | 'coaches'
): string => {
  if (shouldMaskSensitiveInfo(isOwner, userRole)) {
    return maskEmail(email);
  }
  return email || 'Not specified';
};

/**
 * Gets the display value for phone number with privacy masking applied if needed
 * @param phone - The phone number
 * @param isOwner - Whether the current user owns this profile
 * @param userRole - The role of the profile being viewed
 * @returns The phone number or masked version based on privacy settings
 */
export const getPrivatePhone = (
  phone: string | undefined,
  isOwner: boolean,
  userRole: 'athlete' | 'organization' | 'parents' | 'coaches'
): string => {
  if (shouldMaskSensitiveInfo(isOwner, userRole)) {
    return maskPhone(phone);
  }
  return phone || 'Not specified';
};
