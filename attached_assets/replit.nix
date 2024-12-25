{ pkgs }:

pkgs.mkShell {
  buildInputs = [
    pkgs.nodejs-16_x
    pkgs.yarn
  ];
}