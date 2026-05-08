import 'dotenv/config';
import {
  prepareE2EDatabase,
  setProcessDatabaseUrlForE2E,
} from './support/db-e2e';

export default function globalSetup() {
  prepareE2EDatabase(process.env);
  setProcessDatabaseUrlForE2E(process.env);
}
