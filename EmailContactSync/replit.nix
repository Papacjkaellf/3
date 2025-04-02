{pkgs}: {
  deps = [
    pkgs.libmysqlclient
    pkgs.glibcLocales
    pkgs.postgresql
    pkgs.openssl
  ];
}
