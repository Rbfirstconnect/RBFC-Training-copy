/*
  # Enable pgcrypto Extension

  1. Changes
    - Enable pgcrypto extension for password hashing
    - Required for gen_salt() function used in user creation
*/

-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;