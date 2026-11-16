/**
 * Navigation item representation for sidebar navigation links.
 */
export interface NavItem {
  readonly label: string;
  readonly path: string;
  readonly icon: string;
  readonly iconClass?: string;
  readonly exact?: boolean;
}
