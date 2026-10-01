-- AddForeignKey
ALTER TABLE "RecoveryMethod" ADD CONSTRAINT "RecoveryMethod_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
