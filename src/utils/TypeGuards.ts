import { CustomFrontmatterField } from '../settings';

/**
 * Type guard to validate CustomFrontmatterField
 */
export function isCustomFrontmatterField(field: unknown): field is CustomFrontmatterField {
	return (
		typeof field === 'object' &&
		field !== null &&
		'key' in field &&
		'value' in field &&
		'type' in field &&
		'order' in field &&
		typeof (field as CustomFrontmatterField).key === 'string' &&
		typeof (field as CustomFrontmatterField).value === 'string' &&
		typeof (field as CustomFrontmatterField).order === 'number'
	);
}

/**
 * Safely get sorted custom frontmatter fields from settings
 * Uses type guard to ensure runtime type safety
 */
export function getSortedCustomFields(fields: CustomFrontmatterField[]): CustomFrontmatterField[] {
	if (!Array.isArray(fields)) {
		return [];
	}
	
	// Filter out any invalid entries and sort by order
	return fields
		.filter(isCustomFrontmatterField)
		.sort((a, b) => a.order - b.order);
}
