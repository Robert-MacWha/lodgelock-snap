let
  pkgs = import <nixpkgs> { };
in
pkgs.mkShell {
  packages = with pkgs; [
    yarn
    nodejs_22
    temurin-bin-17
  ];
}
