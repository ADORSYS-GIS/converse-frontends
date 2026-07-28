// TEMPORARY fixture for verifying the quality.yml workflow end-to-end.
// Intentionally contains a lint violation, a format violation, and a
// console.log so ESLint / Prettier / Semgrep each have something real to
// report on this PR. Remove this file once the workflow run is confirmed.
export function verifyWorkflow(  ) {
    const unusedVariable = 'this triggers no-unused-vars';
    console.log('verify-workflow fixture executed');
    return true
}
