import { SupabaseClient } from "@supabase/supabase-js";

export interface AuthService {
  signUp(params: SignUpParams): Promise<SignUpResult>;
  signInWithPassword(params: {
    email: string;
    password: string;
  }): Promise<{ data: { user: any }; error: Error | null }>;
  createProfile(params: CreateProfileParams): Promise<void>;
  createOrganization(params: CreateOrganizationParams): Promise<string | null>;
  createUserAndOrganization(params: {
    userId: string;
    fullName: string;
    role: string;
    organizationName?: string;
    organizationDomain?: string;
  }): Promise<void>;
}

export interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
  userType: string;
  organizationName?: string | null;
  organizationDomain?: string | null;
}

export interface SignUpResult {
  userId: string;
  error?: Error;
}

export interface CreateProfileParams {
  userId: string;
  fullName: string;
  role: string;
  organizationId?: string | null;
}

export interface CreateOrganizationParams {
  name: string;
  domain: string;
}

export class SupabaseAuthService implements AuthService {
  constructor(private supabase: SupabaseClient) {}

  async signInWithPassword(params: { email: string; password: string }) {
    return this.supabase.auth.signInWithPassword(params);
  }

  async signUp({
    email,
    password,
    fullName,
    userType,
    organizationName,
    organizationDomain,
  }: SignUpParams): Promise<SignUpResult> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: fullName,
          user_type: userType,
          organization_name: organizationName,
          organization_domain: organizationDomain,
        },
      },
    });

    if (error) {
      return { userId: "", error };
    }

    if (!data.user) {
      return { userId: "", error: new Error("No user returned from sign up") };
    }

    // If we have a user, return their ID regardless of email confirmation status
    // The email confirmation check will be handled by the verify-email page
    return { userId: data.user.id };
  }

  async createOrganization({
    name,
    domain,
  }: CreateOrganizationParams): Promise<string> {
    const { data, error } = await this.supabase
      .from("organizations")
      .insert({
        organization_name: name,
        organization_domain: domain,
      })
      .select("organization_id")
      .single();

    if (error) throw error;
    if (!data) throw new Error("No organization data returned");

    return data.organization_id;
  }

  async createProfile({
    userId,
    fullName,
    role,
    organizationId,
  }: CreateProfileParams): Promise<void> {
    const { error } = await this.supabase.from("user_profiles").insert([
      {
        user_id: userId,
        display_name: fullName,
        user_role: role,
        organization_id: organizationId,
      },
    ]);

    if (error) throw error;
  }

  async createUserAndOrganization({
    userId,
    fullName,
    role,
    organizationName,
    organizationDomain,
  }: {
    userId: string;
    fullName: string;
    role: string;
    organizationName?: string;
    organizationDomain?: string;
  }): Promise<void> {
    const { error } = await this.supabase.rpc("create_user_and_organization", {
      user_id: userId,
      full_name: fullName,
      role: role,
      org_name: organizationName,
      org_domain: organizationDomain,
    });

    if (error) throw error;
  }
}
