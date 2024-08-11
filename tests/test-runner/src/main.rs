use clap::{CommandFactory, Parser};
use color_print::cprintln;

mod cmds;
mod tests;

#[derive(Parser, Debug)]
enum SubCommands {
    Build(cmds::Build),
    Up(cmds::Up),
}

#[derive(Parser, Debug)]
#[clap(author, version)]
#[clap(disable_version_flag = true)] // handled manually
#[clap(
    name = env!("CARGO_PKG_NAME"),
    about = concat!(env!("CARGO_PKG_NAME")," ",env!("CARGO_PKG_VERSION")),
)]
struct CliArgs {
    #[clap(subcommand)]
    cmd: Option<SubCommands>,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_target(false)
        .with_level(true)
        .init();

    let args = CliArgs::parse();
    // Run subcommand
    let res = match args.cmd {
        Some(SubCommands::Build(b)) => b.run().await,
        Some(SubCommands::Up(u)) => u.run().await,
        None => {
            CliArgs::command().print_long_help().unwrap();
            std::process::exit(2);
        }
    };
    if let Err(err) = res {
        cprintln!("<red>Something wrong:\n  {}</red>", err);
        std::process::exit(2);
    }
}
