async function main(): Promise<void> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = now.toISOString();

  console.log("Usage reporting is deferred for the text-first hosted MVP.", {
    start,
    end
  });
  console.log(
    "This script is not part of the launch gate and should only be expanded after the MVP billing/reporting plan is locked."
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
